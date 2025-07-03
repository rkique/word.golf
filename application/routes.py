from flask import current_app as app
from flask import render_template, request, session, make_response, send_from_directory
from .utils import get_curve, similarity
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

PCOUNT = 5
DAYS = 1

HELP_PROMPTS = [["outside", "layer"],["mercury", "razor"]]
HELP_NEIGHBORS = ["underneath", "toothpaste"]

WV = None
PRECOMPUTED = None

#DEV: set backend route correctly.
@app.context_processor
def inject_backend_url():
    backend_url = (
        "http://127.0.0.1:7000"
        if os.getenv("DEV", "false").lower() == "true"
        else "https://routes.word.golf"
    )
    return {"backend_url": backend_url}

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

def jump(start : str) -> str:
    '''
    Jump to a new word and return the updated session data as stringified JSON.
    '''
    # print(f"Jumping to {start}")
    # print("Current session data:", session.get('data'))
    _data = json.loads(session.get('data'))
    target = _data['prompt'][1]
    results = get_curve(start, target, PRECOMPUTED, WV)
    _data['jumps'] = _data['jumps']+1
    _data['results'] = results
    _data['score'] =  similarity(start, target, WV)
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
        'jumpsArray': [],
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
    data['jumpsArray'].append(data['jumps'])
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

def update_jumps_array(new_data, session_data):
    session_data = json.loads(session_data)
    print(f"[update_new_data] updating with {session_data['jumps']}")
    if len(new_data['jumpsArray']) < 5:
        new_data['jumpsArray'] += [session_data['jumps']]
    return new_data

#if user exists and game state for user exists, return it. Else, None.
def get_existing_data():
    user = get_user_from_cookie()
    if not user:
        return None
    
    game_state = GameState.query.filter_by(user_id=user.id, current_date=today.today).first()
    data = {
        'jumpsArray': [],
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
        data['prompt'] = game_state.prompts[game_state.prompt_idx] 
        data['jumps'] = game_state.current_jumps
        data['i'] = game_state.prompt_idx
        data['logged_in'] = user.email
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
            data_today['jumpsArray'] = []
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
        data['jumpsArray'] = []
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


@app.route('/editsession', methods=['POST']) 
def sesh_edit(): 
    try: 
        if request.form.get('edit') is not None: 
            # save_activity() 
            data = json.loads(session.get('data'))
            jumpsA_str = request.form.get("jumpsArray", "[]")
            try:
                # session['jumpsArray'] = [int(x) for x in json.loads(jumpsA_str)]
                data['jumpsArray'] = [int(x) for x in json.loads(jumpsA_str)]
            except json.JSONDecodeError:
                # session['jumpsArray'] = []
                data['jumpsArray'] = []

            jumpsA_result = request.form.get("result", "[]")
            try:
                data['results'] = json.loads(jumpsA_result)
            except json.JSONDecodeError:
                data['results'] = []

            jumps_str = request.form.get("jumps", "0")
            
            # print(session['data']['jumps'])
            try:
                data['jumps'] = int(jumps_str)
            except ValueError:
                data['jumps'] = 0

            # here is the session
            i = request.form.get("i", "0")
            try:
                data['i'] = int(i)
                # session['i'] = data['i']
            except ValueError:
                data['i'] = 0
                # session['i'] = 0

            start_target = request.form.get("prompt", "")
            # print("Start target:", start_target)
            if start_target:
                try:
                    start_target = json.loads(start_target)
                    data['prompt'] = start_target
                except ValueError:
                    data['prompt'] = ["", ""]
            
            session['data'] = json.dumps(data)
            # print("Session data updated:",data)

    except Exception as e: 
        print("Error in /editsession:", e)
        
    # print("Session after edit:", session)
    return app.response_class(
        response=session.get('data', '{}'),
        status=200,
        mimetype='application/json'
    )

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
    if request.form.get('help') is not None:
        session['data'] = make_help_session()
        print('[/] Help Session')
    
    elif request.form.get('help_end') is not None:
        data = json.loads(session.get('data'))
        num_prompts = len(HELP_PROMPTS)
        if data['i'] == num_prompts - 1:
            print('[/] Finished Help')
            data['i'] = 0
            data['jumpsArray'] = []
            data['jumps'] = 0
            data['is_help'] = False
            new_data = get_existing_data()
            print("[index_post help_end] here is new_data: ", new_data)
            if new_data:
                new_data['is_help'] = False
                session['data'] = json.dumps(new_data)
            else:
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
            streak = finished_game(request)
            print(f'streak: [{streak}]')
            data['streak'] = streak
            session['data'] = json.dumps(update_jumps_array(data, session['data']))
            update_game_state(json.loads(session['data']))
            return make_response("session_done" + session.get('data'))
        data['i'] += 1
        _data = shift_to(data['i'])
        session['data'] = json.dumps(update_jumps_array(_data, session['data']))
        update_game_state(json.loads(session['data']))
        
    elif request.form.get('word') is not None:
        current_word = request.form.get('word') 
        print(f"[/] Jumping: {current_word}")
        session['data'] = jump(current_word)
        print(f"[/ word] {session['data']}")
        new_data = json.loads(session['data'])
        new_data['word'] = current_word
        if new_data['is_help'] == False:
            update_game_state(new_data)

    elif request.form.get('redirect') is not None:
        print('[/] Redirecting to start...')
        session_data = json.loads(session["data"])
        print("[index_post redirect] Here is session data: ", session_data)
        if session_data["prompts"] == HELP_PROMPTS or session_data["results"] == []: 
            data = shift_to(0)
            data['jumpsArray'] = []
            session['data'] = json.dumps(data)
        return make_response(json.loads(session['data']))
    else:
        print("[/] ERROR (None of the Above...) ", request.form)

    return make_response(session.get('data'))

