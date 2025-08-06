from threading import Timer
from flask import Blueprint, render_template, request, jsonify, make_response
from flask_socketio import SocketIO, join_room, leave_room, emit
import uuid
import logging
from .. import socketio
from ..utils import get_prompts, txt_to_list, txt_to_dict, get_curve, similarity
import random
import pandas as pd
import ast
import numpy as np
import time

race_bp = Blueprint('race', __name__)

RACE_MODE = 1

# Set up logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.WARNING)
prompt_neighbor_dict = get_prompts(txt_to_list("application/data_10k/race_neighbors_10k.txt"))
PROMPTS = list(prompt_neighbor_dict.keys())
MAX_LOBBY_SIZE = 5
timers = {}  # { lobby_code: { 'time_left': int, 'timer': Timer } }

# In-memory lobby store (no user state)
lobbies = {}
game_states = {}
sid_to_user = {}
default_user_state = {'score': 0, 'wins': 0}
num_prompts = 5

WV = None
PRECOMPUTED = None

def load_race_data():
    global WV, PRECOMPUTED
    if WV is not None:
        return
    WV = pd.read_csv('application/data_10k/embed_w2v.csv')
    WV['vector'] = WV['vector'].apply(lambda x: np.array(ast.literal_eval(x)))
    WV = dict(zip(WV['word'], WV['vector']))
    PRECOMPUTED = txt_to_dict("application/data_10k/top_100_w2v.csv")

@race_bp.route('/race')
def race_lobby():
    return render_template('race.html')

@race_bp.route('/race/<lobby_code>')
def race_lobby_with_code(lobby_code):
    return render_template('race.html', lobby_code=lobby_code)

def users_in_lobby(code):
    if code in game_states:
        return list(game_states[code].keys())
    return []

#a user can join a lobby with multiple sids open
# this triggers on each sid disconnect
# > if all sids disconnected, remove lobby
@socketio.on('disconnect')
def handle_disconnect():
    info = sid_to_user.pop(request.sid, None)
    if info: 
        code, name = info
        if code in game_states and name in game_states[code]:
            del game_states[code][name]
            logger.info(f'[disconnect] Game states: {game_states}')
            if not game_states[code]:
                del game_states[code]
                lobbies.pop(code, None)
                logger.info(f'[disconnect] Lobby removed: {code}')
            emit('users_list', users_in_lobby(code), room=code)
            emit('lobby_list', list(lobbies.keys()), broadcast=True)

@socketio.on('connect')
def handle_connect():
    logger.info(f'[connect] SID: {request.sid} connected')

@socketio.on('get_prompts')
def handle_get_prompts(data):
    global num_prompts
    info = sid_to_user.get(request.sid)
    num_prompts = data.get('num_prompts')
    if info:
        code, name = info
        if code in lobbies:
            starts, targets = update_lobby_starts_targets(code, num_prompts)
            emit('post_prompts', {'starts': starts, 'targets': targets}, room=code)
        else:
            emit('lobby_error', 'You are not in a valid lobby.')
    else:
        emit('lobby_error', 'You must be in a lobby to get new prompts.')

def update_lobby_starts_targets(code, num):
    selected_prompts = random.sample(PROMPTS, num)
    starts = [pair[0] for pair in selected_prompts]
    targets = [pair[1] for pair in selected_prompts]
    lobbies[code] = {'starts': starts, 'targets': targets}
    emit('post_prompts', lobbies[code], room=code)
    return starts, targets

def create_name():
    adjectives = ['silver', 'gold', 'blue', 'pink', 'white', 'green']
    animals = ['fox', 'sparrow', 'tern', 'dove', 'fish', 'otter', 'finch', 'cat']
    return random.choice(adjectives) + '-' + random.choice(animals)

@socketio.on('create_lobby')
def handle_create_lobby(data):
    name = data.get('name')
    if name == '' or name == None:
        name = create_name()
    code = str(uuid.uuid4())[:6].upper()
    random.seed(hash(code))
    starts, targets = update_lobby_starts_targets(code, 5)
    join_room(code) #join room
    game_states[code] = {}
    game_states[code][name] = default_user_state.copy() #can store score, but also game states
    sid_to_user[request.sid] = (code, name)
    #Trigger lobby join on both create 
    logger.info(f'[create_lobby] Lobby joined: {code} by {request.sid}')
    emit('users_list', users_in_lobby(code), room=code)
    emit('lobby_joined', {'lobby': code, 'name': name, 'starts': starts, 'targets': targets})
    emit('lobby_list', list(lobbies.keys()), broadcast=True)

@socketio.on('join_lobby')
def handle_join_lobby(data):
    name = data.get('name')
    if name == '' or name == None:
        name = create_name()
    code = data.get('code', '').strip().upper()
    if code in lobbies:
        if len(game_states[code].keys()) >= MAX_LOBBY_SIZE:
            emit('lobby_error', f'Lobby {code} is full.')
            return
        join_room(code)
        if name in game_states[code]:
            name = f'{name} (1)'
            names = list(game_states[code].keys())
            logger.info(f'[join_lobby] Existing names: {names}')
            while name in names:
                suffix = name.split('(')[-1][0] #get number in parens
                name = name[:-3] + f'({int(suffix) + 1})'
                logger.info(f'[join_lobby] Renamed {data.get("name")} to {name}')
            game_states[code][name] = default_user_state.copy()
        else:
            game_states[code][name] = default_user_state.copy()
        game_states[code][name]['surrender'] = 0
        sid_to_user[request.sid] = (code, name) #assign unique lobby & user
        starts = lobbies[code]['starts']
        targets = lobbies[code]['targets']
        emit('users_list', users_in_lobby(code), room=code)
        emit('lobby_joined', {'lobby': code, 'name': name, 'starts': starts, 'targets': targets})
    else:
        emit('lobby_error', f'Lobby {code} does not exist.')


@socketio.on('give_up')
def surrender(data):
    name = data.get('name')
    lobby = data.get('lobby')
    game_states[lobby][name]['surrender'] = 1
    surrendered_count = sum(
        state.get('surrender', 0) for state in game_states[lobby].values()
    )
    if surrendered_count == len(list(game_states[lobby].keys())):
        if lobby in timers:
            timers[lobby] = False
            del timers[lobby]
        emit('game_finished', {'winner': None, 'game_state': game_states[lobby]}, room=lobby)
    
    socketio.emit('surrender', {'count': surrendered_count, 'total_count': len(list(game_states[lobby].keys()))})

@socketio.on('get_lobbies')
def handle_get_lobbies():
    lobby_codes = list(lobbies.keys())
    emit('lobby_list', lobby_codes) #emitted lobby list.

def handle_round_finish(lobby, user):
    #update user wins count
    game_states[lobby][user]['wins'] += 1
    game_states[lobby][user]['score'] = 0 #reset as winner
    #see if any user has 5 wins:
    winner = None
    for uname, state in game_states[lobby].items():
        if state['wins'] >= num_prompts:
            winner = uname
            break
    if winner:
        if lobby in timers:
            timers[lobby] = False
            del timers[lobby]
        emit('game_finished', {'winner': winner, 'game_state': game_states[lobby]}, room=lobby)
        return
    #update start and target with new games_played index into lobbies[lobby]
    # print(f'[handle_round_finish] user wins: {user_wins}')
    starts = lobbies[lobby]['starts']
    targets = lobbies[lobby]['targets']
    user_wins = game_states[lobby][user]['wins']
    start = starts[user_wins]
    target = targets[user_wins]
    words = get_curve(start, target, PRECOMPUTED, WV, num=14, default=False)
    # print('[handle_round_finish] words are ', words)
    
    emit('round_finished', {'game_state': game_states[lobby], 'user': user, 'words': words, 'start': start, 'target': target}, room=lobby)
    
@socketio.on('click')
def click(data):
    user = data.get('user')
    word = data.get('word')
    target = data.get('target')
    lobby = data.get('lobby')
    logger.info(f'[click] User: {user}, Word: {word}')
    if word == target:
        handle_round_finish(lobby, user)
    else:
        words = get_curve(word, target, PRECOMPUTED, WV, num=14, default=False)
        score = similarity(word, target, WV)
        game_states[lobby][user]['score'] = score
        emit('click', {'user': user, 'words': words, 'game_state': game_states[lobby]}, room=lobby)

@socketio.on('game_started')
def handle_game_start(data):
    global num_prompts
    load_race_data()
    lobby = data.get('lobby')
    # Find the lobby dict for this lobby code
    lobby_info = lobbies.get(lobby)
    if not lobby_info:
        emit('lobby_error', f'Lobby {lobby} does not exist.')
        return
    starts = lobby_info['starts']
    targets = lobby_info['targets']
    users = list(game_states[lobby].keys())
    num_prompts = len(lobby_info['starts'])
    for user in users:
        game_states[lobby][user] = default_user_state.copy()
    words = get_curve(starts[0], targets[0], PRECOMPUTED, WV, num=14, default=False)
    print(f'[game_start] lobbies {lobbies}')
    def countdown():
        time_elapsed = 0
        while(lobby in timers):
            socketio.sleep(1)
            time_elapsed += 1
            socketio.emit('timer_tick', {'time_elapsed': time_elapsed}, room=lobby)
            # socketio.emit('timer_finished', {}, room=lobby)
            # timers.pop(lobby, None)

    if lobby not in timers:
        timers[lobby] = True
        socketio.start_background_task(target=countdown)
    emit('start_game', {'lobby': lobby, 'starts': starts, 'targets': targets, 'words': words, 'users': users, 'game_state': game_states[lobby]}, room=lobby)
    #start_game= True