from .. import db
from flask import current_app as app, request, jsonify
from ..models import GameState
from .auth import get_user_from_cookie

def sum_jumpsA(jumpsA): 
    if not jumpsA: 
        return 0 
    if all(isinstance(x, list) for x in jumpsA): 
        # 2D list: flatten and sum 
        return sum(sum(sublist) - 1 for sublist in jumpsA if sublist) - 1 
    else: 
        # 1D list 
        return sum(jumpsA) 


def game_progress():
    user = get_user_from_cookie()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.get_json()

    game_state = GameState.query.filter_by(user_id=user.id, current_date=data["date"]).first()

    if not game_state:
        # create a new game state for today to reference and update
        starting_game_state = GameState(
            user_id=user.id,
            current_date=data["date"],
            selected_words=[],
            jumpsA=[],
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



def update_game_state(data):
    user = get_user_from_cookie()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    game_state = GameState.query.filter_by(user_id=user.id, current_date=data["date"]).first()

    if not game_state:
        game_state = GameState(user_id=user.id, current_date=data["date"])
        db.session.add(game_state)
        db.session.commit()

    game_state.jumpsA = data.get('jumpsArray', [])
    game_state.results = data.get('results', [])
    game_state.prompt_idx = data.get('i', 0)
    game_state.current_jumps = data.get('jumps', 0)
    game_state.prompts = data.get('prompts', [])

    wrd = data.get('word', None)
    # print("here is word in update_game_state")
    # print(wrd)
    if wrd:
        if game_state.selected_words is None:
            game_state.selected_words = []
        game_state.selected_words.append(wrd)
    
    db.session.commit()

    return jsonify({"message": "Game state updated successfully."}), 200


def game_history():
    user = get_user_from_cookie()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    history = GameState.query.filter_by(user_id=user.id).order_by(GameState.current_date.desc()).all()

    result = [{
        "date": g.current_date.isoformat(),
        "selected_words": g.selected_words,
        "jumpsA": g.jumpsA,
        "total_jumps": g.total_jumps
    } for g in history]

    return jsonify(result)

