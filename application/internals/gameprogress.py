from .. import db
from flask import current_app as app, request, jsonify, redirect
from ..models import GameState, FakeGameState
from .auth import get_user_from_cookie
from dateutil import parser
from datetime import timedelta
from . import today


def sum_jumpsA(jumpsA): 
    if not jumpsA: 
        return 0 
    if all(isinstance(x, list) for x in jumpsA): 
        # 2D list: flatten and sum 
        return sum(sum(sublist) - 1 for sublist in jumpsA if sublist) # - 1 
    else: 
        # 1D list 
        return sum(jumpsA) 

def game_progress(state_model): 
    user = get_user_from_cookie()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    game_state = state_model.query.filter_by(user_id=user.id, current_date=today.today).first()

    if not game_state:
        # create a new game state for today to reference and update
        starting_game_state = state_model(
            user_id=user.id,
            current_date=today.today,
            selected_words=[],
            jumpsA=[[1,0,0,0,0,1],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0]],
            total_jumps=0,
            results=[],
            prompt_idx=0,
            current_jumps=0,
            prompts=[]
        )

        db.session.add(starting_game_state)
        db.session.commit()
    
        return jsonify({"message": "No game progress found for today."}), 200

    result = {
        "selected_words": game_state.selected_words,
        "jumpsA": game_state.jumpsA,
        "total_jumps": game_state.total_jumps,
        "date": game_state.current_date.isoformat(),
        "results": game_state.results,
        "prompt_idx": game_state.prompt_idx,
        "jumps": game_state.current_jumps,
        "prompts": game_state.prompts
    }

    return jsonify(result)

def get_current_game_state(state_model):
    user = get_user_from_cookie()
    if user:
        return state_model.query.filter_by(user_id=user.id, current_date=today.today).first()
    else:
        return None

def update_game_state(data, state_model): 
    user = get_user_from_cookie()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    game_state = state_model.query.filter_by(user_id=user.id, current_date=today.today).first()

    if not game_state:
        game_state = state_model(user_id=user.id, current_date=today.today)
        db.session.add(game_state)
        db.session.commit()

    required_keys = ['jumpsArray', 'results', 'i', 'jumps', 'prompts']
    for key in required_keys:
        assert key in data, f"Missing required key: {key}"

    game_state.jumpsA = data['jumpsArray'] 
    # game_state.startTargetIdxs = data['startTargetIdxs'] 
    game_state.results = data['results'] 
    game_state.prompt_idx = data['i'] 
    game_state.current_jumps = data['jumps'] 
    game_state.prompts = data['prompts'] 
    game_state.start_target_idxs = data["startTargetIdxs"] 

    word = data.get('word', None)
    # print("here is word in update_game_state")
    # print(wrd)
    if word:
        if game_state.selected_words is None:
            game_state.selected_words = []
        game_state.selected_words.append(word)
    
    db.session.commit()

    return jsonify({"message": "Game state updated successfully."}), 200

def finished_game(finish_request, state_model): 
    user = get_user_from_cookie(finish_request)
    if not user:
        return redirect('/')

    game = state_model.query.filter_by(user_id=user.id, current_date=today.today).first()
    if not game:
        return redirect('/')
    

    if today.today != user.last_date_completed: # if it is the same do nothing 
        if not game.prompts or not game.prompts[-1]:
            return jsonify({"error": "User has not played non-tutorial"}), 401, None
        last_prompt = game.prompts[-1][-1]
        game.selected_words.append(last_prompt)
        # game.jumpsA = data["jumpsA"]
        # game.jumpsA.append(game.current_jumps)
        # print("[finished_game]: appending current jumps: ", game.current_jumps)
        # print("[finished_game]: here is new jumpsA: ", game.jumpsA)
        game.total_jumps = sum_jumpsA(game.jumpsA)

        if user.last_date_completed:
            if user.last_date_completed == today.today - timedelta(days=1):
                user.streak += 1  # Increment streak if the last date was yesterday
            elif user.last_date_completed < today.today - timedelta(days=1):
                user.streak = 1  # Reset streak if the last date was more than a day ago
        else:
            # if the user has never completed a game, set streak to 1
            user.streak = 1
        # If the last date is the same as the game date, do nothing (explicitly handled)

        # Update user's streak and last date
        user.last_date_completed = today.today
        # db.session.add(game)
        db.session.commit()

    return None
