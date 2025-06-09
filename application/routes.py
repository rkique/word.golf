from flask import current_app as app
from flask import render_template, request, session, make_response
from .utils import get_curve
import json
import datetime
import pandas as pd
import numpy as np
import ast
from .utils import get_prompts, txt_to_list, txt_to_dict

#Update this to break the neighbors.txt file into 'start,target' and 'neighbor'.
#then, pass 'start,target' pairs as before, but also include neighbor in get_curve

#prompts is a list of [[start, target], neighbor]
prompt_neighbor_dict = get_prompts(txt_to_list("application/data/neighbors.txt"))
PROMPTS = list(prompt_neighbor_dict.keys())

PCOUNT = 5

# session['data'] will be the SSoT

WV = None
PRECOMPUTED = None

def load_data():
    global WV, PRECOMPUTED
    if WV is not None:
        return 
    if WV is None:
        print("Loading data...")
        WV = pd.read_csv("application/data/embed_w2v.csv")
        WV['vector'] = WV['vector'].apply(lambda x: np.array(ast.literal_eval(x)))
        WV = dict(zip(WV['word'], WV['vector']))
        PRECOMPUTED = txt_to_dict("application/data/top_100_w2v.csv")

def jump(start):
    load_data()
    _data = json.loads(session.get('data'))
    target = _data['prompt'][1]
    results = get_curve(start, target, PRECOMPUTED, WV)
    _data['jumps'] = _data['jumps']+1
    _data['results'] = results
    session['data'] = json.dumps(_data)
    return json.dumps(_data)

def elapsed(d):
    previous_date = datetime.datetime.strptime("05-31-2025", '%m-%d-%Y')
    today = d
    return (today - previous_date).days

def shift_to(i):
    load_data()
    elapsed_time = elapsed(datetime.datetime.today())
    prompt = PROMPTS[i+PCOUNT*elapsed_time]
    results = get_curve(prompt[0], prompt[1], PRECOMPUTED, WV)
    
    return json.dumps({
        'jumpsA': session.get('jumpsA'),
        'jumps': 0,
        'i': i,
        'prompt': prompt,
        'prompts': PROMPTS[PCOUNT*elapsed_time:PCOUNT*elapsed_time+PCOUNT],
        'results':results})

def save_activity():
    _data = json.loads(session.get('data'))
    session.get('jumpsA').append(_data['jumps'])
    _data['jumpsA'] = session['jumpsA']
    session['data'] = json.dumps(_data)
    return json.dumps(_data)

@app.route('/')
def index():
    #Load data only once
    load_data()
    assert WV is not None, "Word vectors not loaded"
    # session['i'] = 1
    # session['jumpsA'] = [0]
    session['i'] = 0
    session['jumpsA'] = []
    session['data'] = shift_to(session['i'])
    
    return render_template('index.html', data=json.loads(session.get('data')))


# @app.route('/editsesh', methods=['POST']) 
# def sesh_edit(): 
#     try: 
#         if request.form['edit'] is not None: 
#             save_activity() 
#             print("I am editing this value")
#             session['jumpsA'] = request.form["jumpsA"] 
            
#             session['data']['jumps'] = request.form["jumps"] 
#             print("here is new session")
#     except: 
#         pass 
#     return make_response(session.get('data')) 

@app.route('/editsesh', methods=['POST']) 
def sesh_edit(): 
    try: 
        if request.form.get('edit') is not None: 
            save_activity() 
            

            data = json.loads(session.get('data'))
            
            
            jumpsA_str = request.form.get("jumpsA", "[]")
            
            try:
                session['jumpsA'] = json.loads(jumpsA_str)
                data['jumpsA'] = json.loads(jumpsA_str)
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
            
            

            
            session['data'] = json.dumps(data)

            
    except Exception as e: 
        print("Error in /editsesh:", e)
        
    
    return make_response(session.get('data', {}))


@app.route('/', methods=['POST'])
def index_post():
    try:
        if request.form['end'] is not None:
            save_activity()
            session['i'] = session['i']+1
            session['data'] = shift_to(session['i'])
            if (session['i'] == PCOUNT):
                return make_response("session_done" 
                + session.get('data'))
    except:
        session['data'] = jump(request.form['word'])
    return make_response(session.get('data'))
