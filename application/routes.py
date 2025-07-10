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
from .models import GameState
from . import cookie_signer
from .internals import today

# store logged_in in routes.py
prompt_neighbor_dict = get_prompts(txt_to_list("application/data/neighbors.txt"))
PROMPTS = list(prompt_neighbor_dict.keys())
NEIGHBORS = list(prompt_neighbor_dict.values())

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

elpased = None
prompts_today = None
neighbors_today = None

def add_days(days: int) -> datetime.timedelta:
    return datetime.timedelta(days=days)

def elapsed_days(date : datetime.datetime) -> int:
    start_date = datetime.datetime.strptime("05-30-2025", '%m-%d-%Y').date()
    today.today = date
    return (today.today - start_date).days

def get_prompts_for_date(date : datetime.datetime) -> list:
    '''
    Returns a list of ([start,target],neighbor) for the given date.
    '''
    elapsed = elapsed_days(date)
    prompt_range = range(elapsed * PCOUNT, (elapsed + 1) * PCOUNT)
    return elapsed, [PROMPTS[i] for i in prompt_range], [NEIGHBORS[i] for i in prompt_range]

def load_time():
    global elapsed, prompts_today, neighbors_today
    eastern = datetime.timezone(datetime.timedelta(hours=-5))
    now_utc = datetime.datetime.utcnow()
    now_et = now_utc.replace(tzinfo=datetime.timezone.utc).astimezone(eastern)
    today.today = now_et.replace(tzinfo=None).date() + add_days(DAYS)
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
        if row == [0,0,0,0,0,0]:
            new_data['jumpsArray'][i] = [1,0,0,0,0,1]
            new_data['startTargetIdxs'] = [[i,0],[i,5]]
            break
    print("[update_jumps_array] jumpsArray: ", new_data)
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
    print('[index.html] Current Date: ', today.today)
    data_or_none = get_existing_data()
    if data_or_none:
        data = data_or_none
        # use data_today as base

        if data["results"] == []:
            i = data.get('i', 0)
            data_today = shift_to(i)
            data_today['jumpsArray'] = BASE_JUMPS_ARRAY
            data_today['startTargetIdxs'] = BASE_START_TARGET_IDXS
            data_today['logged_in'] = data["logged_in"]
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
            set_response_cookie(response, token)
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

@app.route('/', methods=['POST'])
def index_post():
    print(f'[/ Jul8] session: {session}')
    if request.form.get('redirect') is not None:
        print('[/] Redirecting to start...')
        #only run this if data in session.
        session_data = json.loads(session["data"])
        print("[index_post redirect] Here is session data: ", session_data)
        if session_data["prompts"] == HELP_PROMPTS or session_data["results"] == []: 
            data_or_none = get_existing_data()
            if data_or_none:
                data = data_or_none
                # use data_today as base
                if data["results"] == []:
                    i = data.get('i', 0)
                    data_today = shift_to(i)
                    data_today['jumpsArray'] = BASE_JUMPS_ARRAY
                    data_today['startTargetIdxs'] = BASE_START_TARGET_IDXS
                    data_today['logged_in'] = data["logged_in"]
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
            data = update_jumps_array(data)
            update_game_state(data)
            streak, total_jumps = finished_game(request)
            print(f'streak: [{streak}]')
            data['streak'] = streak
            data['total_jumps'] = total_jumps
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

