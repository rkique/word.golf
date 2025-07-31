from datetime import date
from ..utils import get_curve, similarity,txt_to_dict
import json
import datetime
import pandas as pd
import numpy as np
import ast
import uuid
import os
from flask import Blueprint,render_template, request, session, make_response, redirect
from ..internals.gameprogress import update_game_state, finished_game, get_current_game_state
from ..internals.auth import get_user_from_cookie
from .auth import create_guest_user, set_response_cookie, get_state_model
from ..internals import globals
from ..internals.globals import PROMPTS, NEIGHBORS, WV, PRECOMPUTED
from ..internals.globals import BASE_JUMPS_ARRAY, HELP_END_JUMPS_ARRAY, BASE_START_TARGET_IDXS
from ..internals.globals import HELP_PROMPTS, HELP_NEIGHBORS, THRESHOLDS, PROMPT_COUNT, DAYS, SKIPPED_TOKEN
from .. import cookie_signer, db

main_bp = Blueprint('main', __name__)

def load_previous_time(new_date):
    print('[load_previous_time] setting globals.today')
    globals.today = new_date
    global elapsed, prompts_today, neighbors_today
    elapsed, prompts_today, neighbors_today = get_prompts_for_date(globals.today)

#WV, PRECOMPUTED should be initialized in globals.
def load_data():
    if globals.WV is not None:
        print('[load_data] WV is not None, returning')
        return 
    print("Loading data...")
    globals.WV = pd.read_csv("application/data/embed_w2v.csv")
    globals.WV['vector'] = globals.WV['vector'].apply(lambda x: np.array(ast.literal_eval(x)))
    globals.WV = dict(zip(globals.WV['word'], globals.WV['vector']))
    globals.PRECOMPUTED = txt_to_dict("application/data/top_100_w2v.csv")

elapsed = None
prompts_today = None
neighbors_today = None

#max-age=0: forces the browser to revalidate on first load
@main_bp.after_request
def no_cache_index(response):
    if request.path == '/' or request.path.endswith('.html'):
        response.headers['Cache-Control'] = 'no-cache, max-age=0, must-revalidate, no-store'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

@main_bp.route('/')
def index():
    print('/ Starting Fresh..')
    load_data()
    load_time()
    state_model = get_state_model()
    data_or_none = get_existing_data(state_model)
    #use the user object with updates from today's data.
    if data_or_none:
        data = data_or_none
        if data["results"] == []:
            i = data.get('i', 0)
            data_today = shift_to(0)
            data_today['selected_words'] = []
            data_today['jumpsArray'] = BASE_JUMPS_ARRAY
            data_today['startTargetIdxs'] = BASE_START_TARGET_IDXS
            data_today['logged_in'] = data["logged_in"]
            data_today['total_jumps'] = 0
            data = data_today
        starts = [prompt[0] for prompt in prompts_today]
        data['wordsArray'] = words_array_from_data(starts, data['selected_words'],  data['jumpsArray'])
        data['is_help'] = False
        session['data'] = json.dumps(data)
        response = make_response(render_template('index.html', data=json.loads(session.get('data'))))
    else:
        print('Creating new user')
        guest_user = create_guest_user(globals.today, str(uuid.uuid4()), state_model)
        data = shift_to(0)
        data['jumpsArray'] = BASE_JUMPS_ARRAY
        data['startTargetIdxs'] = BASE_START_TARGET_IDXS
        data['is_help'] = False
        data['wordsArray'] = []
        session['data'] = json.dumps(data)
        response = make_response(render_template('index.html', data=json.loads(session.get('data'))))
        print("Here is my guest user id: ", guest_user.id)
        token = cookie_signer.dumps({"user_id": guest_user.id})

        if os.getenv("DEV", "false").lower() == "true":
            print("This Dev should NEVER BE TRUE!!!!!")
            set_response_cookie(response, token, secure=False)
        else:
            set_response_cookie(response, token, secure=True)

    assert globals.WV is not None, "Word vectors not loaded"
    return response

@main_bp.route('/', methods=['POST'])
def index_post():
    state_model = get_state_model()
    if request.form.get('redirect') is not None:
        data = json.loads(session.get('data'))
        print('[/] Redirecting to start...')
        data = handle_redirect(data, state_model)
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
            return make_response("end" + session.get('data'))

    elif request.form.get('end') is not None:
        data = json.loads(session.get('data', '{}'))
        print(f"[/] Shifting to Prompt {data.get('i', 0)+1}")
        if (data.get('i', 0) + 1 >= PROMPT_COUNT):
            data = handle_session_end(data, state_model)
            return make_response("session_done" + session.get('data'))
        data['i'] += 1
        _data = shift_to(data['i'])
        session['data'] = json.dumps(update_jumps_array(_data))
        update_game_state(json.loads(session['data']), state_model)
        return make_response("end" + session.get('data'))

    elif request.form.get('word') is not None:
        current_word = request.form.get('word') 
        print(f"[/] Jumping: {current_word}")
        data_or_none = session.get('data')
        if data_or_none is None:
            return redirect('/')
        prev_data = json.loads(data_or_none)
        session['data'] = jump(current_word, current_word != prev_data['prompt'][1])
        new_data = json.loads(session['data'])
        new_data['word'] = current_word
        if new_data['is_help'] == False:
            update_game_state(new_data, state_model)
            selected_words = get_current_game_state(state_model).selected_words
        else:
            selected_words = []
        del new_data['word']
        starts = [prompt[0] for prompt in prompts_today]
        new_data['wordsArray'] = words_array_from_data(starts, selected_words, new_data['jumpsArray'], is_help=new_data['is_help'])
        # print(f'[wordsArray] {new_data["wordsArray"]}')
        session['data'] = json.dumps(new_data)
    else:
        print("[/] ERROR (None of the Above...) ", request.form)

    return make_response(session.get('data'))


@main_bp.route('/solutions')
def serve_data():
    combined = [[prompt[0], neighbor, prompt[1]] for prompt, neighbor in zip(prompts_today, neighbors_today)]
    words = [word for triple in combined for word in triple[1:]]
    js_lines = [
        "function sleep(ms) {",
        "    return new Promise(resolve => setTimeout(resolve, ms));",
        "}",
        "",
        "async function postWordsSequentially() {",
        f"    const words = {words};",
        "    for (const word of words) {",
        "        postWord(word);",
        "        await sleep(200);",
        "    }",
        "}",
        "",
        "postWordsSequentially();"
    ]
    # Write to a .js file
    print("******** Solution Script ********")
    print("\n".join(js_lines))
    return make_response(json.dumps(combined))

#if user exists and game state for user exists, return it. Else, None.
def get_existing_data(state_model):
    print(f'[get_existing_data] today: {globals.today}')
    user = get_user_from_cookie()
    if not user:
        return None
    
    game_state = state_model.query.filter_by(user_id=user.id, current_date=globals.today).first()
    data = {
        'jumpsArray': BASE_JUMPS_ARRAY,
        'startTargetIdxs': BASE_START_TARGET_IDXS,
        'selected_words': [],
        'jumps': 0,
        'i': 0,
        'date': globals.today.strftime('%Y-%m-%d'),
        'results': [],
        'prompts': [],
        'prompt': [],
        'logged_in': user.email if user.email else None,
        'total_jumps': 0,
        'score': 0
    }

    if game_state:
        data['jumpsArray'] = game_state.jumpsA
        data['results'] = game_state.results
        data['prompts'] = game_state.prompts
        data['selected_words'] = game_state.selected_words
        data['jumps'] = game_state.current_jumps
        data['i'] = game_state.prompt_idx
        data['logged_in'] = user.email
        data["startTargetIdxs"] = game_state.start_target_idxs
        if game_state.total_jumps:
            data['total_jumps'] = game_state.total_jumps
        print('data prompt is', data['prompt'])
        if game_state.prompts and game_state.prompt_idx:
            idx = min(game_state.prompt_idx, 4)
            data['prompt'] = game_state.prompts[idx]
        else:
            data['prompt'] = prompts_today[0]
            
        if data['selected_words']:
            targets = [prompt[1] for prompt in prompts_today]
            if data['selected_words'][-1] not in targets:
                data['score'] = similarity(data['selected_words'][-1], data['prompt'][1], globals.WV)
    return data

#Given start words, selected words from the database, and jumps array, return the actual word history for the user.
def words_array_from_data(starts, selected_words, jumps_array,is_help=False):
    # print(f'[words_array] {selected_words}')
    if is_help:
        return [['fruit', 'orchard', 'house', 'porch'],['whisper', 'shouting', 'scuffle']]
    result = []
    l_idx = 0
    for i, row in enumerate(jumps_array):
        r_idx = l_idx + sum(row) - 1
        subarray = [starts[i]] + selected_words[l_idx:r_idx]
        # print(subarray, l_idx, r_idx)
        result.append(subarray)
        l_idx = r_idx
    return result

#Handles game state at redirect. Updates session.data.
def handle_redirect(data, state_model):
    session_data = json.loads(session["data"])
    if session_data["prompts"] == HELP_PROMPTS or session_data["results"] == []: 
        data_or_none = get_existing_data(state_model)
        if data_or_none:
            data = data_or_none
            if data["results"] == []:
                i = data.get('i', 0)
                data_today = shift_to(0)
                data_today['jumpsArray'] = BASE_JUMPS_ARRAY
                data_today['startTargetIdxs'] = BASE_START_TARGET_IDXS
                data_today['logged_in'] = data["logged_in"]
                data_today['total_jumps'] = 0
                data_today['score'] = 0
                data = data_today
            data['is_help'] = False
            starts = [prompt[0] for prompt in prompts_today]
            selected_words = data.get('selected_words', [])
            data['wordsArray'] = words_array_from_data(starts, selected_words, data['jumpsArray'], is_help=data['is_help'])
            session['data'] = json.dumps(data)
        else:
            data = shift_to(0)
            data['jumpsArray'] = BASE_JUMPS_ARRAY
            data['startTargetIdxs'] = BASE_START_TARGET_IDXS
            session['data'] = json.dumps(data)
    return session_data

#Updates game state, retrieves user statistics. Updates session.data.
def handle_session_end(data, state_model):
    data['i'] = 4
    data = update_jumps_array(data)
    update_game_state(data, state_model)
    
    # Update data object with game information from database
    finished_game(request, state_model)
    user = get_user_from_cookie()
    if not user:
        redirect('/')
    streak = user.streak
    current_game = get_current_game_state(state_model)
    if not current_game:
        redirect('/')
    
    total_jumps = current_game.total_jumps
    selected_words = current_game.selected_words
    total_games = state_model.query.filter_by(user_id=user.id).filter(state_model.total_jumps > 0).count()
    
    # Update data with final statistics
    data['total_games'] = total_games
    data['streak'] = streak
    data['total_jumps'] = total_jumps
    
    # Generate words array for display
    starts = [prompt[0] for prompt in prompts_today]
    data['wordsArray'] = words_array_from_data(starts, selected_words, data['jumpsArray'])
    session['data'] = json.dumps(data)
    update_game_state(json.loads(session['data']), state_model)
    return data

def make_help_session():
    """
    Creates a custom session data object with two (prompt, neighbor) tuples:
    ([outside, layer], (underneath)) and ([mercury, razor], toothpaste).
    Uses get_curve to compute results for the first prompt.
    """
    prompt1 = HELP_PROMPTS[0]
    neighbor1 = HELP_NEIGHBORS[0]
    # Compute results for the first prompt
    results = get_curve(prompt1[0], prompt1[1], globals.PRECOMPUTED, globals.WV, neighbor=neighbor1)
    data = {
        'jumpsArray': BASE_JUMPS_ARRAY,
        'startTargetIdxs': BASE_START_TARGET_IDXS,
        'jumps': 0,
        'i': 0,
        'date': globals.today.strftime('%Y-%m-%d'),
        'prompt': prompt1,
        'prompts': HELP_PROMPTS,
        'results': results,
        'is_help': True
    }
    return json.dumps(data)

# The shift_to function does not assign either a jumps or words Array to the object.
def shift_to(i):
    '''
    Shifts the session data to the i-th prompt and returns the updated session data as a dict.
    The session['data'] variable should be set to data after making necessary modifications outside this scope.
    '''
    data = json.loads(session.get('data', '{}'))
    try:
        prompt = prompts_today[i]
        neighbor = neighbors_today[i]
        results = get_curve(prompt[0], prompt[1], globals.PRECOMPUTED, globals.WV, neighbor=neighbor)
        data['i'] = i
        data['jumps'] = 0
        data['date'] = globals.today.strftime('%Y-%m-%d')
        data['prompt'], data['prompts'] = prompt, prompts_today
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
    globals.PRECOMPUTED, globals.WV, neighbor=neighbor)
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

@main_bp.route('/skip', methods=["POST"])
def skip():
    game_data = json.loads(session.get('data'))
    is_help = game_data.get('is_help', False)
    if is_help:
        return "failed"
    user = get_user_from_cookie()
    if not user:
        return "failed"
    state_model = get_state_model()
    game_state = state_model.query.filter_by(user_id=user.id, current_date=globals.today).first()
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
        
        results = get_curve(prompt[0], prompt[1], globals.PRECOMPUTED, globals.WV)

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

@main_bp.route('/back', methods=["POST"])
def back():
    _data = json.loads(session.get('data'))
    is_help = _data.get('is_help', False)
    if is_help:
        return "failed"
    
    user = get_user_from_cookie()
    if not user:
        return "failed"
    state_model = get_state_model()
    game_state = state_model.query.filter_by(user_id=user.id, current_date=globals.today).first()
    if not game_state:
        return "failed"
    
    print("Here is game_state previous words", game_state.selected_words)
    
    target = _data['prompt'][1]
    results_10 = _data['results'][10]
    prompt_start = _data['prompt'][0]
    selected_words_len = len(game_state.selected_words)
    last_row = get_last_nonzero_row(game_state.jumpsA)
    last_row_score = sum(game_state.jumpsA[last_row]) - 2

    if target == results_10 or prompt_start == results_10 or selected_words_len < 2 or last_row_score < 2:
        return "failed"
    # check current jumpsArray and see if it is in the beginning of it 
    start = game_state.selected_words[-2] 
    # rearrange the order of selected words 
    
    returned_object = {}
    score = similarity(start, target, globals.WV)
    startIdx, targetIdx = _data["startTargetIdxs"]
    row = startIdx[0]
    index = sim_to_index(score)
    startIdx = [row, index]
    returned_object["results"] = get_curve(start, target, globals.PRECOMPUTED, globals.WV)
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
    results = get_curve(start, target, globals.PRECOMPUTED, globals.WV)
    # _data['jumps'] = _data['jumps']+1
    _data['results'] = results
    _data['score'] =  similarity(start, target, globals.WV)
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

def add_days(days: int) -> datetime.timedelta:
    return datetime.timedelta(days=days)

def elapsed_days(date : datetime.datetime) -> int:
    return (date - globals.start_date).days

def get_prompts_for_date(date : datetime.datetime) -> list:
    '''
    Returns a list of ([start,target],neighbor) for the given date.
    '''
    elapsed = elapsed_days(date)
    prompt_range = range(elapsed * PROMPT_COUNT, (elapsed + 1) * PROMPT_COUNT)
    return elapsed, [PROMPTS[i] for i in prompt_range], [NEIGHBORS[i] for i in prompt_range]

def load_time():
    global elapsed, prompts_today, neighbors_today
    globals.today = date.today()
    globals.today = globals.today + add_days(DAYS)
    elapsed, prompts_today, neighbors_today = get_prompts_for_date(globals.today)

def sim_to_index(score):
    idx = next((i for i, t in enumerate(THRESHOLDS) if score < t), len(THRESHOLDS))
    return idx

