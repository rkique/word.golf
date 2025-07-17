from flask import current_app as app
from flask import render_template, request, session, make_response, send_from_directory
from .utils import get_curve, similarity
from zoneinfo import ZoneInfo
import json
import datetime
import pandas as pd
import numpy as np
import ast
from .utils import get_prompts, txt_to_list, txt_to_dict
from flask import redirect
import os
import uuid
from .internals.auth import get_user_from_cookie, create_guest_user, user_session_exists, set_response_cookie
from .internals.gameprogress import update_game_state, finished_game
from .models import GameState, User
from . import cookie_signer, db
from .internals import today
from datetime import date

# store logged_in in routes.py
prompt_neighbor_dict = get_prompts(txt_to_list("application/data/neighbors.txt"))
PROMPTS = list(prompt_neighbor_dict.keys())
NEIGHBORS = list(prompt_neighbor_dict.values())
PRECISION = 1

BASE_JUMPS_ARRAY = [[1,0,0,0,0,1],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0]]

HELP_END_JUMPS_ARRAY = [[1,0,1,0,1,1],
                        [1,1,0,0,0,1],
                        [0,0,0,0,0,0],
                        [0,0,0,0,0,0],
                        [0,0,0,0,0,0]]

BASE_START_TARGET_IDXS = [[0,0], [0,5]]
PCOUNT = 5
DAYS = 0

SKIPPED_TOKEN = "<SKIPPED>"

HELP_PROMPTS = [["fruit", "porch"],["whisper", "scuffle"]]
HELP_NEIGHBORS = ["tree", "shouting"]

WV = None
PRECOMPUTED = None

#max-age=0: forces the browser to revalidate on first load
@app.after_request
def no_cache_index(response):
    if request.path == '/' or request.path.endswith('.html'):
        response.headers['Cache-Control'] = 'no-cache, max-age=0, must-revalidate, no-store'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

@app.route('/solutions')
def serve_data():
    combined = [[prompt[0], neighbor, prompt[1]] for prompt, neighbor in zip(prompts_today, neighbors_today)]
    return make_response(json.dumps(combined))

def load_data():
    global WV, PRECOMPUTED
    if WV is not None:
        return 
    print("Loading data...")
    WV = pd.read_csv("application/data/embed_w2v.csv")
    WV['vector'] = WV['vector'].apply(lambda x: np.array(ast.literal_eval(x)))
    WV = dict(zip(WV['word'], WV['vector']))
    PRECOMPUTED = txt_to_dict("application/data/top_100_w2v.csv")

elapsed = None
prompts_today = None
neighbors_today = None

def add_days(days: int) -> datetime.timedelta:
    return datetime.timedelta(days=days)

def elapsed_days(date : datetime.datetime) -> int:
    start_date = datetime.datetime.strptime("05-30-2025", '%m-%d-%Y').date()
    return (date - start_date).days

def get_prompts_for_date(date : datetime.datetime) -> list:
    '''
    Returns a list of ([start,target],neighbor) for the given date.
    '''
    elapsed = elapsed_days(date)
    prompt_range = range(elapsed * PCOUNT, (elapsed + 1) * PCOUNT)
    return elapsed, [PROMPTS[i] for i in prompt_range], [NEIGHBORS[i] for i in prompt_range]

def load_time():
    global elapsed, prompts_today, neighbors_today
    today.today = date.today()
    today.today = today.today + add_days(DAYS)
    elapsed, prompts_today, neighbors_today = get_prompts_for_date(today.today)

def sim_to_index(score):
    thresholds = [0.2, 0.27, 0.35, 0.42]
    idx = next((i for i, t in enumerate(thresholds) if score < t), len(thresholds))
    return idx

def update_jumps(jumpsArray, score):
    '''
    Add one jump to jumpsArray (no rows.)
    '''
    col = sim_to_index(score)

    non_zero_row = -1
    for i in range(len(jumpsArray)):
        if jumpsArray[i] == [0,0,0,0,0,0]:
            non_zero_row = i - 1
            break

    if(non_zero_row == -1):
        non_zero_row = len(jumpsArray) - 1 #4
    
    jumpsArray[non_zero_row][col] += 1
    return jumpsArray, [non_zero_row, col]

def jump(start : str, update = True) -> str:
    ''' 
    Jump to a new word and return the updated session data as stringified JSON. 
    ''' 
    # print(f"Jumping to {start}") 
    # print("Current session data:", session.get('data')) 
    _data = json.loads(session.get('data'))
    target = _data['prompt'][1]
    results = get_curve(start, target, PRECOMPUTED, WV)
    # _data['jumps'] = _data['jumps']+1
    _data['results'] = results
    _data['score'] =  similarity(start, target, WV)
    #Moving jump logic into this method.
    [startIdx, targetIdx] = _data['startTargetIdxs']
    if update:
        _data['jumpsArray'], startIdx = update_jumps(_data['jumpsArray'], _data['score'])
    _data['startTargetIdxs'] = [startIdx, targetIdx]
    session['data'] = json.dumps(_data)
    return json.dumps(_data)

def get_last_nonzero_row(jumpsArray):
    non_zero_row = -1

    for i in range(len(jumpsArray)):
        if jumpsArray[i] == [0,0,0,0,0,0]:
            non_zero_row = i - 1
            break

    if(non_zero_row == -1):
        non_zero_row = len(jumpsArray) - 1 #4

    return non_zero_row

@app.route('/skip', methods=["POST"])
def skip():
    game_data = json.loads(session.get('data'))
    is_help = game_data.get('is_help', False)
    if is_help:
        return "failed"
    user = get_user_from_cookie()
    if not user:
        return "failed"
    game_state = GameState.query.filter_by(user_id=user.id, current_date=today.today).first()
    if not game_state:
        return "failed"
    print("Here is game_state previous words", game_state.selected_words)
    
    current_prompt = get_last_nonzero_row(game_state.jumpsA)
    
    # update the backend game state object 
    current_prompt_score = sum(game_state.jumpsA[current_prompt]) - 2
    while current_prompt_score < 12:
        game_state.selected_words.append(SKIPPED_TOKEN)
        game_data['jumpsArray'][current_prompt][0] +=1
        current_prompt_score += 1
    
    # game_data['jumpsArray'] = game_state.jumpsA
    # shift to the next prompt
    print("data jumpsArray before update: ", game_data['jumpsArray'])

    returned_object = {}

    if current_prompt == 4: # if we are at the last prompt, we need to end the game 
        prompt = prompts_today[current_prompt]

        returned_object["startTargetIdxs"] = game_state.start_target_idxs

        returned_object["done"] = True

        game_data['jumpsArray'][current_prompt][5] = 0 # we did not reach the end

        game_state.jumpsA = game_data['jumpsArray']
    else:
        game_data = update_jumps_array(game_data)

        game_state.jumpsA = game_data['jumpsArray']

        print("data jumpsArray after update: ", game_data['jumpsArray'])

        current_prompt = current_prompt + 1

        prompt = prompts_today[current_prompt]
        
        results = get_curve(prompt[0], prompt[1], PRECOMPUTED, WV)

        game_state.results = results

        returned_object["startTargetIdxs"] = [[current_prompt, 0], [current_prompt, 5]]

        game_state.start_target_idxs = returned_object["startTargetIdxs"]

        returned_object["done"] = False
    
    game_state.prompt_idx = current_prompt

    db.session.commit()

    # now shift the jumpsArray
    # now construct the response object
    
    returned_object["results"] = game_state.results
    
    returned_object["jumpsArray"] = game_state.jumpsA
    returned_object["start_target"] = [prompt[0], prompt[1]]
    returned_object["prompt"] = prompt
    returned_object["current_prompt"] = current_prompt

    

    game_data['i'] += 1
    game_data['jumps'] = 0
    game_data['jumpsArray'] = game_state.jumpsA
    game_data['results'] = game_state.results
    game_data['startTargetIdxs'] = returned_object["startTargetIdxs"]
    game_data['prompt'] = prompt

    session['data'] = json.dumps(game_data)
    # send data to backend

    return make_response(json.loads(json.dumps(returned_object)))

@app.route('/back', methods=["POST"])
def back():
    _data = json.loads(session.get('data'))
    is_help = _data.get('is_help', False)
    if is_help:
        return "failed"
    user = get_user_from_cookie()
    if not user:
        return "failed"
    game_state = GameState.query.filter_by(user_id=user.id, current_date=today.today).first()
    if not game_state:
        return "failed"
    print("Here is game_state previous words", game_state.selected_words)
    # check for end of game/end of round 
    target = _data['prompt'][1]
    if target == _data['results'][10]:
        return "failed"
    # check if the selected words and check if we are at a starting word
    if _data['prompt'][0] == _data['results'][10]:
        return "failed"
    # see if the length is ok and then 
    if len(game_state.selected_words) < 2:
        return "failed"
    get_last_row = get_last_nonzero_row(game_state.jumpsA)
    # see if we just switched prompts
    if sum(game_state.jumpsA[get_last_row]) - 2 < 2:
        return "failed"
    # check current jumpsArray and see if it is in the beginning of it 
    start = game_state.selected_words[-2] 
    # rearrange the order of selected words 
    
    returned_object = {}
    score = similarity(start, target, WV)
    startIdx, targetIdx = _data["startTargetIdxs"]
    row = startIdx[0]
    index = sim_to_index(score)
    startIdx = [row, index]
    returned_object["results"] = get_curve(start, target, PRECOMPUTED, WV)
    returned_object["startTargetIdxs"] = [startIdx, targetIdx]
    returned_object["jumpsArray"] = _data["jumpsArray"]
    returned_object["start_target"] = [returned_object["results"][10], target]
    returned_object["prompt"] = _data['prompt']
    game_state.selected_words[-2], game_state.selected_words[-1] = game_state.selected_words[-1], game_state.selected_words[-2]
    game_state.results = returned_object["results"]
    db.session.commit()

    print("Here is new game_state previous words", game_state.selected_words)
    # Try to get the start target idxs 
    return make_response(json.loads(json.dumps(returned_object)))

def make_help_session():
    """
    Creates a custom session data object with two (prompt, neighbor) tuples:
    ([outside, layer], (underneath)) and ([mercury, razor], toothpaste).
    Uses get_curve to compute results for the first prompt.
    """
    prompt1 = HELP_PROMPTS[0]
    neighbor1 = HELP_NEIGHBORS[0]
    # Compute results for the first prompt
    results = get_curve(prompt1[0], prompt1[1], PRECOMPUTED, WV, neighbor=neighbor1)
    data = {
        'jumpsArray': BASE_JUMPS_ARRAY,
        'startTargetIdxs': BASE_START_TARGET_IDXS,
        'jumps': 0,
        'i': 0,
        'date': today.today.strftime('%Y-%m-%d'),
        'prompt': prompt1,
        'prompts': HELP_PROMPTS,
        'results': results,
        'is_help': True
    }
    return json.dumps(data)

def shift_to(i):
    '''
    Shifts the session data to the i-th prompt and returns the updated session data as a dict.
    The session['data'] variable should be set to data after making necessary modifications outside this scope.
    '''
    data = json.loads(session.get('data', '{}'))
    try:
        prompt = prompts_today[i]
        neighbor = neighbors_today[i]
        # print(f"[shift_to] prompt {i}: {prompt} with neighbor {neighbor}")
        results = get_curve(prompt[0], prompt[1], PRECOMPUTED, WV, neighbor=neighbor)
        data['i'] = i
        data['jumps'] = 0
        data['date'] = today.today.strftime('%Y-%m-%d')
        data['prompt'], data['prompts'] = prompt, prompts_today
        print(f"[shift_to] prompts_today {prompts_today}")
        data['results'] = results
    except IndexError:
        print(f"Index {i} out of range for prompts_today or neighbors_today, indicating user finish. Returning same data.")
        data['i'] = i
    return data

def help_shift(data):
    data = update_jumps_array(data)
    data['jumps'] = 0
    data['i'] += 1
    data['prompts'] = HELP_PROMPTS
    data['neighbors'] = HELP_NEIGHBORS
    neighbor = data['neighbors'][data['i']]
    prompt = data['prompts'][data['i']]
    data['prompt'] = prompt
    results = get_curve(prompt[0], prompt[1], 
    PRECOMPUTED, WV, neighbor=neighbor)
    data['results'] = results
    return data

def check_if_max(row):
    if sum(row) >= 14:
        row[5] = 0
    return row

def update_jumps_array(new_data):
    for i, row in enumerate(new_data['jumpsArray']):
        #close old row
        new_data['jumpsArray'][i] = check_if_max(new_data['jumpsArray'][i])
        #open new row.
        # print("[update_jumps_array] row: ", row, "equals [0,0,0,0,0,0]: ", row == [0,0,0,0,0,0])
        if row == [0,0,0,0,0,0]:
            # print("[update_jumps_array] Found empty row at index: ", i)
            # print("[update_jumps_array] Before : ", [1,0,0,0,0,1])
            new_data['jumpsArray'][i] = [1,0,0,0,0,1]
            # print("[update_jumps_array] Setting new row to: ", new_data['jumpsArray'][i])
            new_data['startTargetIdxs'] = [[i,0],[i,5]]
            break
    # print("[update_jumps_array] jumpsArray: ", new_data)
    return new_data

#if user exists and game state for user exists, return it. Else, None.
def get_existing_data():
    user = get_user_from_cookie()
    if not user:
        return None
    
    game_state = GameState.query.filter_by(user_id=user.id, current_date=today.today).first()
    data = {
        'jumpsArray': BASE_JUMPS_ARRAY,
        'startTargetIdxs': BASE_START_TARGET_IDXS,
        'jumps': 0,
        'i': 0,
        'date': today.today.strftime('%Y-%m-%d'),
        'results': [],
        'prompts': [],
        'prompt': [],
        'logged_in': user.email if user.email else None,
        'total_jumps': 0,
    }

    if game_state:
        data['jumpsArray'] = game_state.jumpsA
        data['results'] = game_state.results
        data['prompts'] = game_state.prompts
        # data['prompt'] = game_state.prompts[game_state.prompt_idx] if game_state.prompts and game_state.prompt_idx else prompts_today[0]
        data['jumps'] = game_state.current_jumps
        data['i'] = game_state.prompt_idx
        data['logged_in'] = user.email
        data["startTargetIdxs"] = game_state.start_target_idxs
        if game_state.total_jumps:
            data['total_jumps'] = game_state.total_jumps
        if game_state.prompts and game_state.prompt_idx:
            idx = min(game_state.prompt_idx, 4)
            data['prompt'] = game_state.prompts[idx]
        else:
            data['prompt'] = prompts_today[0]
    return data

@app.route('/')
def index():
    print('/ Starting Fresh..')
    load_data()
    load_time()
    data_or_none = get_existing_data()
    if data_or_none:
        data = data_or_none
        # use data_today as base

        if data["results"] == []:
            i = data.get('i', 0)
            data_today = shift_to(0)
            data_today['jumpsArray'] = BASE_JUMPS_ARRAY
            data_today['startTargetIdxs'] = BASE_START_TARGET_IDXS
            data_today['logged_in'] = data["logged_in"]
            data_today['total_jumps'] = 0
            data = data_today
        data['is_help'] = False
        session['data'] = json.dumps(data)
        response = make_response(render_template('index.html', data=json.loads(session.get('data'))))
    else:
        print('Creating new user')
        guest_user = create_guest_user(today.today, str(uuid.uuid4()))
        # try:
        #     #
        #     session_data = json.loads(session.get("data", "{}"))
        #     if session_data.get('date') != today.today.strftime('%Y-%m-%d'):
        #         session_data['i'] = 0
        # except Exception:
        #     print('[/] Exception in loading session_data')
        #     session_data = {}
        # i = session_data.get('i', 0)

        data = shift_to(0)
        data['jumpsArray'] = BASE_JUMPS_ARRAY
        data['startTargetIdxs'] = BASE_START_TARGET_IDXS
        data['is_help'] = False
        session['data'] = json.dumps(data)
        response = make_response(render_template('index.html', data=json.loads(session.get('data'))))
        token = cookie_signer.dumps({"user_id": guest_user.id})

        if os.getenv("DEV", "false").lower() == "true":
            print("This Dev should NEVER BE TRUE!!!!!")
            set_response_cookie(response, token, secure=False)
        else:
            set_response_cookie(response, token, secure=True)

    assert WV is not None, "Word vectors not loaded"
    print('/ data is set to:', session.get('data'))
    # return render_template('index.html', data=json.loads(session.get('data')))
    return response

@app.route('/login', methods=['GET'])
def login():
    # this returns the login page stored at /templates/login.html
    date = today.today.strftime('%Y-%m-%d') if today.today else datetime.datetime.today().strftime('%Y-%m-%d')
    return render_template('login.html', date=date)

@app.route('/resetpassword', methods=['GET'])
def resetpassword():
    # this returns the password reset page stored at /templates/resetpassword.html
    date = today.today.strftime('%Y-%m-%d') if today.today else datetime.datetime.today().strftime('%Y-%m-%d')
    return render_template('resetpassword.html', date=date)

@app.route('/profile', methods=['GET'])
def profile():
    user = get_user_from_cookie()
    if not user or not user.email:
        return redirect('/login')
    
    game_state = GameState.query.filter_by(user_id=user.id, current_date=today.today).first()

    # look for best score through all game states
    best_score = GameState.query.filter_by(user_id=user.id).order_by(GameState.total_jumps.asc()).first()
    if best_score:
        best_score = best_score.total_jumps
    else:
        best_score = game_state.total_jumps if game_state else 0
    
    total_games = GameState.query.filter_by(user_id=user.id).filter(GameState.total_jumps > 0).count()
    streak = user.streak if user.streak else 0

    # get the average jumps per game
    if total_games > 0:
        average_total_jumps = round(GameState.query.filter_by(user_id=user.id).filter(GameState.total_jumps > 0).with_entities(db.func.avg(GameState.total_jumps)).scalar(), PRECISION)
    else:
        average_total_jumps = game_state.total_jumps if game_state else 0
    
    total_jumps = GameState.query.filter_by(user_id=user.id).with_entities(db.func.sum(GameState.total_jumps)).scalar()
    if total_jumps is None:
        total_jumps = 0 
    average_jumps_per_prompt = round(total_jumps / (total_games * PCOUNT), PRECISION) if total_games > 0 else 0

    # make an array of the total jumps over time (filtering from furthest date to today)
    game_states = GameState.query.filter_by(user_id=user.id).order_by(GameState.current_date.desc()).all()
    total_jumps_over_time = []
    total_jumps_average_per_date = []
    for gs in game_states:
        if gs.total_jumps == 0:
            continue
        else:
            # now calculate the average jumps per date for all users!
            relavent_game_states = GameState.query.filter_by(current_date=gs.current_date).all()
            total_jumps_for_date = 0
            number_of_game_states = 0
            if relavent_game_states:
                for g in relavent_game_states:
                    if g.total_jumps > 0:
                        number_of_game_states += 1
                    total_jumps_for_date += g.total_jumps
            total_jumps_average_per_date.append({
                'date': gs.current_date.strftime('%Y-%m-%d'),
                'average_jumps': total_jumps_for_date / number_of_game_states if number_of_game_states else 0
            })
            total_jumps_over_time.append({
                'date': gs.current_date.strftime('%Y-%m-%d'),
                'total_jumps': gs.total_jumps
            })
    total_jumps_over_time.reverse()
    total_jumps_average_per_date.reverse()

    # get the amount of games played this month
    games_and_dates_played_this_month = []
    games_this_month = GameState.query.filter(
        db.extract('year', GameState.current_date) == today.today.year,
        db.extract('month', GameState.current_date) == today.today.month,
        GameState.user_id == user.id,
        GameState.total_jumps > 0
    )
    for game in games_this_month:
        games_and_dates_played_this_month.append({
            'date': game.current_date.strftime('%Y-%m-%d')
        })

    return render_template('profile.html', email=user.email, 
                           total_games=total_games, 
                           streak=streak,
                           average_total_jumps=average_total_jumps, 
                           average_prompt_jumps=average_jumps_per_prompt, 
                           best_score=best_score, 
                           jumps_data=total_jumps_over_time, 
                           jumps_average_data=total_jumps_average_per_date, 
                           month_stats=games_and_dates_played_this_month)

@app.route('/per-jump-statistics', methods=['GET'])
def per_jump_statistics():
    game_date = today.today
    gamestates = GameState.query.filter_by(current_date=game_date).order_by(GameState.current_date.desc()).all()
    today_prompts = gamestates[0].prompts
    starting_words = []
    ending_words = []
    for prompt in today_prompts:
        starting_words.append(prompt[0])
        ending_words.append(prompt[1])
    counts = {}
    for i in range(5):
        counts[i] = {}
        for index in range(1, 13):
            counts[i][index] = {}
            for gamestate in gamestates:
                previous_jumps = 0
                i_cpy = i - 1
                while i_cpy >= 0:
                    previous_jumps += sum(gamestate.jumpsA[i_cpy]) - 1
                    i_cpy = i_cpy - 1
                current_jumps = sum(gamestate.jumpsA[i]) - 1 
                list_replacing_prompts = gamestate.selected_words
                if list_replacing_prompts:
                    if index > current_jumps or previous_jumps + index - 1 >= len(list_replacing_prompts):
                        continue
                    else:
                        if list_replacing_prompts[previous_jumps + index - 1]:
                            if list_replacing_prompts[previous_jumps + index - 1] in counts[i][index]:
                                counts[i][index][list_replacing_prompts[previous_jumps + index - 1]] += 1
                            else:
                                counts[i][index][list_replacing_prompts[previous_jumps + index - 1]] = 1
    print("Counts: ", counts)
    return make_response(counts)

@app.route('/user-statistics', methods=['GET'])
def user_statistics():
    user = get_user_from_cookie()
    if not user:
        return redirect('/login')
    
    game_state = GameState.query.filter_by(user_id=user.id, current_date=today.today).first()
    if not game_state:
        return redirect('/')

    # look for best score through all game states
    best_score = GameState.query.filter_by(user_id=user.id).order_by(GameState.total_jumps.asc()).first()
    if best_score:
        best_score = best_score.total_jumps
    else:
        best_score = game_state.total_jumps
    
    # get the total games played by user
    total_games = GameState.query.filter_by(user_id=user.id).count()

    # get the average jumps per game
    if total_games > 0:
        average_total_jumps = GameState.query.filter_by(user_id=user.id).with_entities(db.func.avg(GameState.total_jumps)).scalar()
    else:
        average_total_jumps = game_state.total_jumps

    # get the average jumps per prompt for all time
    total_jumps = GameState.query.filter_by(user_id=user.id).with_entities(db.func.sum(GameState.total_jumps)).scalar()
    if total_jumps is None:
        total_jumps = 0 
    average_jumps_per_prompt = total_jumps / (total_games * PCOUNT) if total_games > 0 else 0

    # of the LOGGED IN users (user.email is not None), get my 'leaderboard' position
    all_game_states = GameState.query.filter_by(current_date=today.today).order_by(GameState.total_jumps.asc()).all()
    current_user = user
    leaderboard = []
    for gs in all_game_states:
        if gs.total_jumps > 0:
            leaderboard.append(gs)

    my_jumps_position = leaderboard.index(game_state) if game_state in leaderboard else None

    # create a new list of just gamestate_ids and total_jumps
    real_leaderboard = []
    user_string = "user"
    for i in range(len(leaderboard)):
        game = leaderboard[i]
        new_obj = {
            'name': user_string,
            'total_jumps': game.total_jumps,
        }
        if i == my_jumps_position:
            new_obj['name'] = "You"

        real_leaderboard.append(new_obj)

    my_jumps_position = my_jumps_position + 1 if my_jumps_position is not None else None

    # of the LOGGED IN users (user.email is not None), get my leaderboard position for streaks
    users = User.query.all()
    streak_leaderboard = []
    for user in users:
        if user.email is None:
            continue
        streak_leaderboard.append(user)
    # sort by streak
    streak_leaderboard.sort(key=lambda u: u.streak, reverse=True)
    # print("Streak leaderboard: ", streak_leaderboard)
    my_streak_position = streak_leaderboard.index(current_user) if current_user in streak_leaderboard else None

    my_streak_position = my_streak_position + 1 if my_streak_position is not None else None

    return render_template('user-statistics.html', email=current_user.email, total_games=total_games,
                           average_total_jumps=average_total_jumps, 
                           average_prompt_jumps=average_jumps_per_prompt, 
                           total_jumps=game_state.total_jumps, best_score=best_score,
                           total_jumps_leaderboard=my_jumps_position,
                           total_streaks_leaderboard=my_streak_position,
                           real_leaderboard=real_leaderboard)

def words_array_from_data(starts, selected_words, jumps_array):
    result = []
    l_idx = 0
    for i, row in enumerate(jumps_array):
        r_idx = l_idx + sum(row) - 1
        subarray = [starts[i]] + selected_words[l_idx:r_idx]
        result.append(subarray)
        l_idx = r_idx
    return result

@app.route('/', methods=['POST'])
def index_post():
    if request.form.get('redirect') is not None:
        print('[/] Redirecting to start...')
        #only run this if data in session.
        session_data = json.loads(session["data"])
        if session_data["prompts"] == HELP_PROMPTS or session_data["results"] == []: 
            data_or_none = get_existing_data()
            if data_or_none:
                data = data_or_none
                # use data_today as base
                if data["results"] == []:
                    i = data.get('i', 0)
                    data_today = shift_to(0)
                    data_today['jumpsArray'] = BASE_JUMPS_ARRAY
                    data_today['startTargetIdxs'] = BASE_START_TARGET_IDXS
                    data_today['logged_in'] = data["logged_in"]
                    data_today['total_jumps'] = 0
                    data = data_today
                data['is_help'] = False
                session['data'] = json.dumps(data)
            else:
                data = shift_to(0)
                data['jumpsArray'] = BASE_JUMPS_ARRAY
                data['startTargetIdxs'] = BASE_START_TARGET_IDXS
                session['data'] = json.dumps(data)
        return make_response(json.loads(session['data']))

    elif request.form.get('help') is not None:
        session['data'] = make_help_session()
        print('[/] Help Session')
    
    elif request.form.get('help_end') is not None:
        data = json.loads(session.get('data'))
        num_prompts = len(HELP_PROMPTS)
        if data['i'] == num_prompts - 1:
            print('[/] Finished Help')
            data['jumpsArray'] = HELP_END_JUMPS_ARRAY
            # data['i'] = 0
            # data['jumpsArray'] = BASE_JUMPS_ARRAY
            # data['startTargetIdxs'] = BASE_START_TARGET_IDXS
            # data['jumps'] = 0
            data['is_help'] = False
            # new_data = get_existing_data()
            # if new_data:
            #     new_data['is_help'] = False
            #     session['data'] = json.dumps(new_data)
            # else:
            session['data'] = json.dumps(data)
            return make_response("help_session_done" + session.get('data'))
        else:
            data = help_shift(data)
            session['data'] = json.dumps(data)

    elif request.form.get('end') is not None:
        data = json.loads(session.get('data', '{}'))
        print(f"[/] Shifting to Prompt {data.get('i', 0)+1}")
        if (data.get('i', 0) + 1 >= PCOUNT):
            data['i'] = 4
            print("Previous data: ", data)
            data = update_jumps_array(data)
            print("Updated data: ", data)
            update_game_state(data)
            #update data object with game information from database
            streak, total_jumps, selected_words = finished_game(request)
            data['streak'] = streak
            data['totalJumps'] = total_jumps
            starts = [prompt[0] for prompt in prompts_today]
            data['wordsArray'] = words_array_from_data(starts, selected_words, data['jumpsArray'])
            session['data'] = json.dumps(data)
            update_game_state(json.loads(session['data']))
            return make_response("session_done" + session.get('data'))
        data['i'] += 1
        _data = shift_to(data['i'])
        session['data'] = json.dumps(update_jumps_array(_data))
        update_game_state(json.loads(session['data']))
        
    elif request.form.get('word') is not None:
        current_word = request.form.get('word') 
        print(f"[/] Jumping: {current_word}")
        data_or_none = session.get('data')
        if data_or_none is None:
            return redirect('/')
        prev_data = json.loads(data_or_none)
        session['data'] = jump(current_word, current_word != prev_data['prompt'][1])
        print(f"[/ word] {session['data']}")
        new_data = json.loads(session['data'])
        new_data['word'] = current_word
        print("here is new data is_help: ", new_data['is_help'])
        print(new_data['is_help'] == False)
        if new_data['is_help'] == False:
            update_game_state(new_data)

    else:
        print("[/] ERROR (None of the Above...) ", request.form)

    return make_response(session.get('data'))

