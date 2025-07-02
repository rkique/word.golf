from .. import db
from flask import current_app as app, request, jsonify
from ..models import GameState
from .auth import get_user_from_session
from dateutil import parser
from datetime import timedelta

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
    user = get_user_from_session()
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
    user = get_user_from_session()
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


@app.route("/update_finish", methods=["POST"])
def finished_game():
    user = get_user_from_session()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.get_json()
    # required = ["last_complete"]
    print("here is the data received")
    print(data)
    if "last_complete" not in data:
        return jsonify({"error": "Missing required fields"}), 400

    game_date = parser.isoparse(data["last_complete"]).date()
    
    print("here is user")
    print(user)
    print("here is game_date")
    print(game_date)
    game = GameState.query.filter_by(user_id=user.id, current_date=game_date).first()
    if not game:
        return jsonify({"error": "Should already have a game state"}), 400


    print(f"GameState fields: id={game.id}, user_id={game.user_id}, current_date={game.current_date}, "
          f"selected_words={game.selected_words}, jumpsA={game.jumpsA}, total_jumps={game.total_jumps}, "
          f"results={game.results}, prompt_idx={game.prompt_idx}, current_jumps={game.current_jumps}, "
          f"prompts={game.prompts}")


    if game_date != user.last_date_completed: # if it is the same do nothing 
        last_prompt = game.prompts[-1][-1]
        game.selected_words.append(last_prompt)
        # game.jumpsA = data["jumpsA"]
        game.total_jumps = sum_jumpsA(game.jumpsA)

        # Update the user's streak based on the last date completed
        if user.last_date_completed:
            if user.last_date_completed == game_date - timedelta(days=1):
                user.streak += 1  # Increment streak if the last date was yesterday
            elif user.last_date_completed < game_date - timedelta(days=1):
                user.streak = 1  # Reset streak if the last date was more than a day ago
        else:
            # if the user has never completed a game, set streak to 1
            user.streak = 1
        # If the last date is the same as the game date, do nothing (explicitly handled)

        # Update user's streak and last date
        user.last_date_completed = game_date
        # db.session.add(game)
        db.session.commit()
    

    result = {
        "newStreak": user.streak,
        "jumpsA": game.jumpsA,
        "total_jumps": game.total_jumps,
    }

    return jsonify(result), 200
