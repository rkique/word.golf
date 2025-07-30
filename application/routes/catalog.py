from flask import current_app as app
from flask import render_template, request, session, make_response
from flask import Blueprint
import json
import datetime
import os
import pandas as pd
import numpy as np
import ast
from flask import redirect
from .main import WV, prompts_today, neighbors_today
from .main import get_state_model, get_existing_data, load_previous_time
from .main import words_array_from_data, shift_to, add_days, load_data
import uuid
from ..internals.auth import get_user_from_cookie
from .auth import create_guest_user, set_response_cookie
from ..internals.globals import WV, BASE_JUMPS_ARRAY, BASE_START_TARGET_IDXS
from .. import cookie_signer
from ..internals import globals
from datetime import date
from ..utils import txt_to_dict
catalog_bp = Blueprint('catalog', __name__)

#share prompts_today

@catalog_bp.route('/past', methods=['GET'])
def catalog():
    print('/ Starting Fresh..')
    load_data()
    num_day = request.args.get('day', default=0, type=int)
    print(f'Day offset received: {num_day}')
    new_date = globals.start_date + add_days(num_day)
    if new_date >= date.today():
        print('[past] in future')
        return redirect('/')
    load_previous_time(new_date)
    from .main import prompts_today
    print(f'[past] {prompts_today}') #these are correct.
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
    return response

@catalog_bp.route('/catalog', methods=['GET'])
def previous_prompts():
    user = get_user_from_cookie()
    if not user:
        redirect('/')
    complete_games_and_dates = []
    incomplete_games_and_dates = []
    state_model = get_state_model()
    completed_games = state_model.query.filter(
        state_model.user_id == user.id,
        state_model.total_jumps > 0
    )

    for game in completed_games:
        complete_games_and_dates.append({
            'date': game.current_date.strftime('%Y-%m-%d')
        })
    
    incomplete_games = state_model.query.filter(
        state_model.user_id == user.id,
        state_model.total_jumps == 0,
        state_model.selected_words != []
    )

    for game in incomplete_games:
        incomplete_games_and_dates.append({
            'date': game.current_date.strftime('%Y-%m-%d')
        })
    print(f'[catalog] Complete games: {complete_games_and_dates}, Incomplete games: {incomplete_games_and_dates}')
    return render_template('catalog.html', completed_games = complete_games_and_dates, incomplete_games = incomplete_games_and_dates)

