
from flask import Blueprint, render_template, request, jsonify, make_response
from flask_socketio import SocketIO, join_room, leave_room, emit
import uuid
from .. import socketio
from ..utils import get_prompts, txt_to_list, get_curve, similarity
from . import main
import random

race_bp = Blueprint('race', __name__)

prompt_neighbor_dict = get_prompts(txt_to_list("application/data/race_neighbors.txt"))
PROMPTS = list(prompt_neighbor_dict.keys())
MAX_LOBBY_SIZE = 8
# In-memory lobby store (no user state)
lobbies = {}
game_states = {}
sid_to_user = {}
default_user_state = {'score': 0, 'wins': 0}

@race_bp.route('/race')
def race_lobby():
        return render_template('race.html')

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
            print('[disconnect] ', game_states)
            if not game_states[code]:
                del game_states[code]
                lobbies.pop(code, None)
                print('[disconnect] Lobby removed:', code)
            emit('users_list', users_in_lobby(code), room=code)
            emit('lobby_list', list(lobbies.keys()), broadcast=True)

@socketio.on('connect')
def handle_connect():
    print(f'[connect] SID: {request.sid} connected')

@socketio.on('get_prompts')
def handle_get_prompts():
    info = sid_to_user.get(request.sid)
    if info:
        code, name = info
        if code in lobbies:
            # Generate new prompts for the lobby
            random.seed()  # Reset seed to get truly random prompts
            selected_prompts = random.sample(PROMPTS, 5)
            starts = [pair[0] for pair in selected_prompts]
            targets = [pair[1] for pair in selected_prompts]
            
            lobbies[code]['starts'] = starts
            lobbies[code]['targets'] = targets
            emit('post_prompts', {'starts': starts, 'targets': targets}, room=code)
        else:
            emit('lobby_error', 'You are not in a valid lobby.')
    else:
        emit('lobby_error', 'You must be in a lobby to get new prompts.')

@socketio.on('create_lobby')
def handle_create_lobby(data):
    name = data.get('name')
    if name == '' or name == None:
        name = 'Anonymous'
    code = str(uuid.uuid4())[:6].upper()
    random.seed(hash(code))
    selected_prompts = random.sample(PROMPTS, 5)
    starts = [pair[0] for pair in selected_prompts]
    targets = [pair[1] for pair in selected_prompts]
    lobbies[code] = {'starts': starts, 'targets': targets}
    join_room(code) #join room
    game_states[code] = {}
    game_states[code][name] = default_user_state.copy() #can store score, but also game states
    sid_to_user[request.sid] = (code, name)
    #Trigger lobby join on both create 
    print('lobby joined:', code, 'by', request.sid)
    emit('lobby_joined', {'lobby': code, 'name': name, 'starts': starts, 'targets': targets})
    emit('lobby_list', list(lobbies.keys()), broadcast=True)
    emit('users_list', users_in_lobby(code), room=code)

@socketio.on('join_lobby')
def handle_join_lobby(data):
    name = data.get('name')
    if name == '' or name == None:
        name = 'Anonymous'
    code = data.get('code', '').strip().upper()
    if code in lobbies:
        if len(game_states[code].keys()) >= MAX_LOBBY_SIZE:
            emit('lobby_error', f'Lobby {code} is full.')
            return
        join_room(code)
        if name in game_states[code]:
            name = f'{name} (1)'
            names = list(game_states[code].keys())
            print(f'[join_lobby] names {names}')
            while name in names:
                suffix = name.split('(')[-1][0] #get number in parens
                name = name[:-3] + f'({int(suffix) + 1})'
                print(f'[join_lobby] Renamed {data.get("name")} to {name}')
            game_states[code][name] = default_user_state.copy()
        else:
            game_states[code][name] = default_user_state.copy()
        sid_to_user[request.sid] = (code, name) #assign unique lobby & user
        starts = lobbies[code]['starts']
        targets = lobbies[code]['targets']
        emit('lobby_joined', {'lobby': code, 'name': name, 'starts': starts, 'targets': targets})
        emit('users_list', users_in_lobby(code), room=code)
    else:
        emit('lobby_error', f'Lobby {code} does not exist.')

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
        if state['wins'] >= 5:
            winner = uname
            break
    if winner:
        emit('game_finished', {'winner': winner, 'game_state': game_states[lobby]}, room=lobby)
        return
    #update start and target with new games_played index into lobbies[lobby]
    # print(f'[handle_round_finish] user wins: {user_wins}')
    starts = lobbies[lobby]['starts']
    targets = lobbies[lobby]['targets']
    user_wins = game_states[lobby][user]['wins']
    start = starts[user_wins]
    target = targets[user_wins]
    words = get_curve(start, target, main.PRECOMPUTED, main.WV, True)
    # print('[handle_round_finish] words are ', words)
    emit('round_finished', {'game_state': game_states[lobby], 'user': user, 'words': words, 'start': start, 'target': target}, room=lobby)

@socketio.on('click')
def click(data):
    user = data.get('user')
    word = data.get('word')
    target = data.get('target')
    lobby = data.get('lobby')
    print('[Click] User:', user, 'Word:', word)
    if word == target:
        handle_round_finish(lobby, user)
    else:
        words = get_curve(word, target, main.PRECOMPUTED, main.WV, False)
        score = similarity(word, target, main.WV)
        game_states[lobby][user]['score'] = score
        emit('click', {'user': user, 'words': words, 'game_state': game_states[lobby]}, room=lobby)

@socketio.on('game_started')
def handle_game_start(data):
    main.load_data()
    lobby = data.get('lobby')
    # Find the lobby dict for this lobby code
    lobby_info = lobbies.get(lobby)
    if not lobby_info:
        emit('lobby_error', f'Lobby {lobby} does not exist.')
        return
    starts = lobby_info['starts']
    targets = lobby_info['targets']
    users = list(game_states[lobby].keys())
    words = get_curve(starts[0], targets[0], main.PRECOMPUTED, main.WV, True)
    emit('start_game', {'lobby': lobby, 'starts': starts, 'targets': targets, 'words': words, 'users': users, 'game_state': game_states[lobby]}, room=lobby)
    #start_game= True