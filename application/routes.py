from flask import current_app as app
from flask import render_template, request, session, make_response
from .utils import get_curve
import json
import datetime
import pandas as pd
import numpy as np
import ast
from .utils import get_prompts, txt_to_list, txt_to_dict


prompt_neighbor_dict = get_prompts(txt_to_list("application/data/neighbors.txt"))
PROMPTS = list(prompt_neighbor_dict.keys())
NEIGHBORS = list(prompt_neighbor_dict.values())

PCOUNT = 5
DAYS = 0

# session['data'] will be the SSoT

WV = None
PRECOMPUTED = None

def load_data():
    global WV, PRECOMPUTED
    if WV is not None:
        return 
    print("Loading data...")
    WV = pd.read_csv("application/data/embed_w2v.csv")
    WV['vector'] = WV['vector'].apply(lambda x: np.array(ast.literal_eval(x)))
    WV = dict(zip(WV['word'], WV['vector']))
    PRECOMPUTED = txt_to_dict("application/data/top_100_w2v.csv")

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
    return [PROMPTS[i] for i in prompt_range], [NEIGHBORS[i] for i in prompt_range]

def load_time():
    global prompts_today, neighbors_today, today
    today = datetime.datetime.today() + add_days(DAYS)
    prompts_today, neighbors_today = get_prompts_for_date(today)

def jump(start : str) -> str:
    '''
    Jump to a new word and return the updated session data as stringified JSON.
    '''
    print(f"Jumping to {start}")
    print("Current session data:", session.get('data'))
    _data = json.loads(session.get('data'))
    target = _data['prompt'][1]
    results = get_curve(start, target, PRECOMPUTED, WV)
    _data['jumps'] = _data['jumps']+1
    _data['results'] = results
    session['data'] = json.dumps(_data)
    return json.dumps(_data)


def shift_to(i):
    '''
    Shifts the session data to the i-th prompt and returns the updated session data.
    If i is out of range, results is set to None.
    '''
    try:
        prompt = prompts_today[i]
        neighbor = neighbors_today[i]
        results = get_curve(prompt[0], prompt[1], PRECOMPUTED, WV, neighbor=neighbor)

    except IndexError:
        prompt,neighbor,results = None, None, None

    return json.dumps({
        'jumpsA': session.get('jumpsA'),
        'jumps': 0,
        'i': i,
        'date': today.strftime('%Y-%m-%d'),
        'prompt': prompt,
        'prompts': prompts_today,
        'results': results})

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
    load_data()
    load_time()
    session['i'] = 0
    session['jumpsA'] = []
    assert WV is not None, "Word vectors not loaded"
    session['data'] = shift_to(session['i'])
    # session['data']
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
            print("Start target:", start_target)
            if start_target:
                try:
                    start_target = json.loads(start_target)
                    data['prompt'] = start_target
                except ValueError:
                    data['prompt'] = ["", ""]
            
            session['data'] = json.dumps(data)



            
    except Exception as e: 
        print("Error in /editsesh:", e)
        
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
    try:
        if request.form['end'] is not None:
            print(f"shifting to prompt {session['i']+1}")
            save_activity()
            session['i'] = session['i']+1
            session['data'] = shift_to(session['i'])
            if (session['i'] == PCOUNT):
                return make_response("session_done" 
                + session.get('data'))
    except:
        session['data'] = jump(request.form['word'])
    # print("Session data:", session.get('data'))
    return make_response(session.get('data'))
