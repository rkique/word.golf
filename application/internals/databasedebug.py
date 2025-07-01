from .. import db
from flask import current_app as app, jsonify
from .auth import get_user_from_cookie
from ..models import User, GameState

@app.route('/delete_fake_users', methods=['GET'])
def delete_fake_users():
    try:

        fake_users = User.query.filter(User.email.like('%fake%')).all()

        if not fake_users:
            return jsonify({"message": "No fake users found."}), 404


        for user in fake_users:

            GameState.query.filter(GameState.user_id == user.id).delete()


        user_ids = [user.id for user in fake_users]
        User.query.filter(User.id.in_(user_ids)).delete(synchronize_session=False)

        db.session.commit()

        return jsonify({"message": f"Deleted {len(fake_users)} users and their game states."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"An error occurred: {str(e)}"}), 500


@app.route('/print_db_contents', methods=['GET'])
def print_db_contents():
    try:
        users = User.query.all()
        
        user_data = []

        for user in users:
            game_states = GameState.query.filter(GameState.user_id == user.id).all()

            user_dict = {
                "id": user.id,
                "provider": user.provider,
                "provider_id": user.provider_id,
                "streak": user.streak,
                "date_created": user.date_created,
                "last_date_completed": user.last_date_completed,
                "game_states": [] 
            }
            if user.email:
                user_dict["email"] = user.email

            for game_state in game_states:
                game_state_dict = {
                    "id": game_state.id,
                    "user_id": game_state.user_id,
                    "current_date": game_state.current_date,
                    "selected_words": game_state.selected_words,
                    "jumpsA": game_state.jumpsA,
                    "total_jumps": game_state.total_jumps,
                    "results": game_state.results,
                    "prompt_idx": game_state.prompt_idx,
                    "current_jumps": game_state.current_jumps,
                    "prompts": game_state.prompts
                }
                user_dict["game_states"].append(game_state_dict)

            user_data.append(user_dict)

        return jsonify({
            "users": user_data
        })

    except Exception as e:
        return jsonify({"message": f"An error occurred: {str(e)}"}), 500

@app.route('/delete_most_recent_gamestate', methods=['POST'])
def delete_most_recent_gamestate():
    user = get_user_from_cookie()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    game_state = GameState.query.filter_by(user_id=user.id).order_by(GameState.current_date.desc()).first()
    if not game_state:
        return jsonify({"message": "No game state found to delete."}), 404

    db.session.delete(game_state)
    db.session.commit()
    return jsonify({"message": "Most recent game state deleted."}), 200


@app.route('/delete_all_gamestates', methods=['POST'])
def delete_all_gamestates():
    user = get_user_from_cookie()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    deleted = GameState.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({"message": f"Deleted {deleted} game states for user."}), 200


@app.route('/list_gamestates', methods=['GET'])
def list_gamestates():
    user = get_user_from_cookie()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    game_states = GameState.query.filter_by(user_id=user.id).order_by(GameState.current_date.desc()).all()
    result = []
    for gs in game_states:
        gs_dict = {
            "id": gs.id,
            "user_id": gs.user_id,
            "current_date": gs.current_date.isoformat() if gs.current_date else None,
            "selected_words": gs.selected_words,
            "jumpsA": gs.jumpsA,
            "total_jumps": gs.total_jumps,
            "results": gs.results,
            "prompt_idx": gs.prompt_idx,
            "current_jumps": gs.current_jumps,
            "prompts": gs.prompts
        }
        result.append(gs_dict)
    return jsonify({"game_states": result}), 200


@app.route("/data", methods=["GET"])
def get_user_data():
    user = get_user_from_cookie()
    if not user:
        return jsonify({"error": "Not authenticated"}), 200

    game_state = GameState.query.filter_by(user_id=user.id).order_by(GameState.current_date.desc()).first()
    return jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "streak": user.streak,
            "date_created": user.date_created.isoformat() if user.date_created else None,
            "last_date_completed": user.last_date_completed.isoformat() if user.last_date_completed else None
        },
        "game_state": {
            "id": game_state.id if game_state else None,
            "user_id": game_state.user_id if game_state else None,
            "current_date": game_state.current_date.isoformat() if game_state and game_state.current_date else None,
            "selected_words": game_state.selected_words if game_state else [],
            "jumpsA": game_state.jumpsA if game_state else [[1,0,0,0,0,1],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0]],
            "total_jumps": game_state.total_jumps if game_state else 0,
            "results": game_state.results if game_state else [],
            "prompt_idx": game_state.prompt_idx if game_state else 0,
            "current_jumps": game_state.current_jumps if game_state else 0,
            "prompts": game_state.prompts if game_state else []
        }
    })