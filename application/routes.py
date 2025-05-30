from flask import current_app as app
from flask import render_template, request, session, make_response
from .utils import get_curve, PROMPTS
import json
import datetime


PCOUNT = 5

#session['data'] will be the SSoT

def jump(start):
    _data = json.loads(session.get('data'))
    target = _data['prompt'][1]
    results = get_curve(start, target)
    _data['jumps'] = _data['jumps']+1
    _data['results'] = results
    session['data'] = json.dumps(_data)
    return json.dumps(_data)

def elapsed(d):
    previous_date = datetime.datetime.strptime("05-10-2025", '%m-%d-%Y')
    today = d
    return (today - previous_date).days

def shift_to(i):
    elapsed_time = elapsed(datetime.datetime.today())
    prompt = PROMPTS[i+PCOUNT*elapsed_time]
    results = get_curve(prompt[0], prompt[1])
    return json.dumps({
        'jumpsA': session.get('jumpsA'),
        'jumps': 0,
        'i': i,
        'prompt': prompt,
        'prompts': PROMPTS[PCOUNT*elapsed_time:PCOUNT*elapsed_time+PCOUNT],
        'results':results})

#there isn't a jumpsA at this point...
def save_activity():
    _data = json.loads(session.get('data'))
    session.get('jumpsA').append(_data['jumps'])
    _data['jumpsA'] = session['jumpsA']
    session['data'] = json.dumps(_data)
    return json.dumps(_data)

@app.route('/')
def index():
    session['i'] = 0
    session['jumpsA'] = []
    session['data'] = shift_to(session['i'])
    return render_template('index.html', data=json.loads(session.get('data')))

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
