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

SIM_INTERVALS = [0.2,0.27,0.35,0.42]
prompt_neighbor_dict = get_prompts(txt_to_list("application/data/neighbors.txt"))
PROMPTS = list(prompt_neighbor_dict.keys())
NEIGHBORS = list(prompt_neighbor_dict.values())

PCOUNT = 5
DAYS = 0

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

#DEV: no caching of static files.
# @app.after_request
# def add_header(response):
#     if os.getenv("DEV", "false").lower() == "true":
#         if request.path.startswith('/static/'):
#             response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
#             response.headers['Pragma'] = 'no-cache'
#             response.headers['Expires'] = '0'
#     return response

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
today = None

def add_days(days: int) -> datetime.timedelta:
    return datetime.timedelta(days=days)

def elapsed_days(date : datetime.datetime) -> int:
    start_date = datetime.datetime.strptime("05-30-2025", '%m-%d-%Y')
    today = date
    return (today - start_date).days

def get_prompts_for_date(date : datetime.datetime) -> list:
    '''
    Returns a list of ([start,target],neighbor) for the given date.
    '''
    elapsed = elapsed_days(date)
    prompt_range = range(elapsed * PCOUNT, (elapsed + 1) * PCOUNT)
    print(f"Loading prompts: {prompt_range}")
    return elapsed, [PROMPTS[i] for i in prompt_range], [NEIGHBORS[i] for i in prompt_range]

def load_time():
    global elapsed, prompts_today, neighbors_today, today
    today = datetime.datetime.today() + add_days(DAYS)
    elapsed, prompts_today, neighbors_today = get_prompts_for_date(today)

def sim_idx(start, target):
    print(f"[sim_idx] {start} and {target}")
    if start is None or target is None:
        return 0
    sim = similarity(start, target, WV)
    for i, threshold in enumerate(SIM_INTERVALS):
        if sim < threshold:
            return i
    return len(SIM_INTERVALS)

def jump(start : str) -> str:
    '''
    Jump to a new word and return the updated session data as stringified JSON.
    '''
    # print(f"Jumping to {start}")
    # print("Current session data:", session.get('data'))
    _data = json.loads(session.get('data'))
    target = _data['prompt'][1]
    jumps = _data['jumps']

    #uses session variable.
    current_sim_idx = sim_idx(start, target)
    last_sim_idx = session.get('similarity_idx', 0)
    if current_sim_idx < last_sim_idx:
        print(f'Sim idx would be lowered from {last_sim_idx} to {current_sim_idx}, returning original data',)
        return json.dumps(_data)
    else:
        print(f'sim idx of {start} {target} is {current_sim_idx}')
        session['similarity_idx'] = current_sim_idx

    if jumps > 2:
        results = get_curve(start, target, PRECOMPUTED, WV, linear=True)
    else:
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
        'jumpsA': [],
        'jumps': 0,
        'i': 0,
        'date': today.strftime('%Y-%m-%d') if today else datetime.datetime.today().strftime('%Y-%m-%d'),
        'prompt': prompt1,
        'prompts': HELP_PROMPTS,
        'results': results,
        'is_help': True
    }
    return json.dumps(data)

def shift_to(i):
    '''
    Shifts the session data to the i-th prompt and returns the updated session data.
    If i is out of range, results is set to None.
    '''
    try:
        prompt = prompts_today[i]
        neighbor = neighbors_today[i]
        # print(f"[shift_to] prompt {i}: {prompt} with neighbor {neighbor}")
        results = get_curve(prompt[0], prompt[1], PRECOMPUTED, WV, neighbor=neighbor)

    except IndexError:
        print(f"Index {i} out of range for prompts_today or neighbors_today.")
        prompt,neighbor,results = None, None, None
    data = {
        'jumpsA': session.get('jumpsA'),
        'jumps': 0,
        'i': i,
        'date': today.strftime('%Y-%m-%d'),
        'prompt': prompt,
        'prompts': prompts_today,
        'results': results}
    return json.dumps(data)

def help_shift(data):
    data['jumpsA'].append(data['jumps'])
    data['jumps'] = 0
    i = data['i'] + 1
    data['i'] = i
    #(in case there was a reload)
    data['prompts'] = HELP_PROMPTS
    data['neighbors'] = HELP_NEIGHBORS

    neighbor = data['neighbors'][i]
    prompt = data['prompts'][i]
    data['prompt'] = prompt
    results = get_curve(prompt[0], prompt[1], 
    PRECOMPUTED, WV, neighbor=neighbor)
    data['results'] = results
    return data

def save_activity():
    '''
    Saves a completed activity to the session.
    '''
    _data = json.loads(session.get('data'))
    session.get('jumpsA').append(_data['jumps'])
    _data['jumpsA'] = session['jumpsA']
    session['data'] = json.dumps(_data)
    return json.dumps(_data)

#Load both data and time once at the starting screen.
@app.route('/')
def index():
    print('/ Starting Fresh..')
    load_data()
    load_time()
    session['i'] = 0
    session['jumpsA'] = []
    assert WV is not None, "Word vectors not loaded"
    session['data'] = shift_to(session['i'])
    # print('/ data is set to:', session.get('data'))
    return render_template('index.html', data=json.loads(session.get('data')))


@app.route('/editsession', methods=['POST']) 
def sesh_edit(): 
    try: 
        if request.form.get('edit') is not None: 
            save_activity() 

            data = json.loads(session.get('data'))
            
            jumpsA_str = request.form.get("jumpsA", "[]")
            
            try:
                session['jumpsA'] = [int(x) for x in json.loads(jumpsA_str)]
                data['jumpsA'] = [int(x) for x in json.loads(jumpsA_str)]
            except json.JSONDecodeError:
                session['jumpsA'] = []
                data['jumpsA'] = []

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
                session['i'] = data['i']
            except ValueError:
                data['i'] = 0
                session['i'] = 0

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
    return make_response(session.get('data', {}))

@app.route('/login', methods=['GET'])
def login():
    # this returns the login page stored at /templates/login.html
    return render_template('login.html')

@app.route('/resetpassword', methods=['GET'])
def resetpassword():
    # this returns the password reset page stored at /templates/resetpassword.html
    return render_template('resetpassword.html')

@app.route('/', methods=['POST'])
def index_post():
    if request.form.get('help') is not None:
        session['data'] = make_help_session()
        print('[/] Help Session')
    
    elif request.form.get('help_end') is not None:
        data = json.loads(session.get('data'))
        print(f"[/] Next Help Prompt ({data['i']+1}/{len(data['prompts'])})")
        if data['i'] == len(data['prompts']) - 1:
            print('[/] Finished Help')
            data['is_help'] = False
            data['i'] += 1
            data['jumpsA'].append(data['jumps'])
            data['jumps'] = 0
            session['data'] = json.dumps(data)
            return make_response("help_session_done" + session.get('data'))
        else:
            data = help_shift(data)
            session['data'] = json.dumps(data)

    elif request.form.get('end') is not None:
        session['similarity_idx'] = 0
        print(f"[/] Shifting to Prompt {session['i']+1}")
        print("here is session data:", session.get('data'))
        print("session i:", session['i'])
        session['i'] = session['i']+1
        if (session['i'] > PCOUNT):
            return make_response("session_done" + session.get('data'))
        save_activity()
        
        session['data'] = shift_to(session['i'])
        if (session['i'] == PCOUNT):
            return make_response("session_done" + session.get('data'))
        
    elif request.form.get('word') is not None:
        current_word = request.form.get('word') 
        print(f"[/] Jumping: {current_word}")
        session['data'] = jump(current_word)

    elif request.form.get('redirect') is not None:
        print('[/] Redirecting to start...')
        session['data'] = shift_to(0)
        return make_response(json.loads(session['data']))
    else:
        print("[/] ERROR (None of the Above...) ", request.form)

    return make_response(session.get('data'))
