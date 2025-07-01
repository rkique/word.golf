from .. import db, oauth, cookie_signer
from flask import current_app as app, request, jsonify, redirect, session
from .crypto import Hash, PasswordKDF, generate_salt
from ..models import User, GameState
from cryptography.hazmat.primitives import constant_time
from datetime import datetime, timedelta
import uuid

def get_user_from_cookie():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return User.query.filter_by(id=user_id).first()

@app.route('/authlogin', methods=['POST'])
def authlogin():
    current_user = get_user_from_cookie()
    if request.method == "POST":
        data = request.get_json()
    else:
        data = request.args

    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"error": "Missing credentials"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    try:
        derived_key = PasswordKDF(password, user.salt, 16)
        hashed = Hash(derived_key)
    except Exception:
        return jsonify({"error": "Password processing failed"}), 500

    if constant_time.bytes_eq(hashed, user.password):
        # Find the game state using the user ID from the cookie
        if current_user:
            game_state = GameState.query.filter_by(user_id=current_user.id, current_date=data["date"]).first()
            if game_state:
                existing = GameState.query.filter_by(user_id=user.id, current_date=game_state.current_date).first()
                if existing:
                    print(f"existing GameState: id={existing.id}, user_id={existing.user_id}, current_date={existing.current_date}, "
                        f"selected_words={existing.selected_words}, jumpsA={existing.jumpsA}, total_jumps={existing.total_jumps}, "
                        f"results={existing.results}, prompt_idx={existing.prompt_idx}, current_jumps={existing.current_jumps}, "
                        f"prompts={existing.prompts}")
                else:
                    print("existing GameState: None")

                # need to update the previous words to update the user's streak
                if game_state and not existing and game_state.selected_words and game_state.prompts and game_state.prompts[-1]:
                    
                    if game_state.selected_words[-1] == game_state.prompts[-1][-1]:
                        # update the user's streak and other metrics (we just finished a day)
                        if game_state.current_date != user.last_date_completed: # if it is the same do nothing 
                            game_state.user_id = user.id

                            # Update the user's streak based on the last date completed
                            if user.last_date_completed:
                                if user.last_date_completed == game_state.current_date - timedelta(days=1):
                                    user.streak += 1  # Increment streak if the last date was yesterday
                                elif user.last_date_completed < game_state.current_date - timedelta(days=1):
                                    user.streak = 1  # Reset streak if the last date was more than a day ago
                            else:
                                # if the user has never completed a game, set streak to 1
                                user.streak = 1
                            # If the last date is the same as the game date, do nothing (explicitly handled)

                            # Update user's streak and last date
                            user.last_date_completed = game_state.current_date
                            db.session.commit()
        response = jsonify({"message": "Login successful"})
        session["user_id"] = user.id
        return response

    return jsonify({"error": "Invalid email or password"}), 401


@app.route('/authcreate', methods=['POST'])
def create_user():
    if request.method == "POST":
        data = request.get_json()
    else:
        data = request.args

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing required fields"}), 200

    # Check if email is already taken by another user
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already exists"}), 200

    # Get the current user from the cookie (should be a guest user)
    user = get_user_from_cookie()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    # If the user already has an email, they are already registered
    if user.email:
        return jsonify({"error": "User already registered"}), 400

    salt = generate_salt(4)
    password_kdf = PasswordKDF(password, salt, 16)
    hashed_password = Hash(password_kdf)

    # Update the guest user to a registered user
    user.email = email
    user.salt = salt
    user.password = hashed_password

    db.session.commit()

    response = jsonify({"message": "User created and logged in successfully"})
    return response


def create_guest_user(date, id):
    user = User(
        id=id,
        date_created=date,
        streak=0,
        last_date_completed=None
    )
    
    db.session.add(user)
    db.session.commit()

    starting_game_state = GameState(
        user_id=user.id,
        current_date=date,
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

    return user



def logout():
    # Get the current (logged-in) user
    data = request.get_json()
    user = get_user_from_cookie()
    if not user:
        # If not authenticated, just create a guest user and set cookie
        new_user = create_guest_user(data["date"])
    else:
        # Create a new guest user
        new_user = create_guest_user(data["date"])
        # Transfer today's game state from the logged-in user to the guest user
        old_game_state = GameState.query.filter_by(user_id=user.id, current_date=data["date"]).first()
        if old_game_state:
            # Use the existing blank GameState created by create_guest_user and update its fields
            guest_game_state = GameState.query.filter_by(user_id=new_user.id, current_date=old_game_state.current_date).first()
            if guest_game_state:
                guest_game_state.selected_words = list(old_game_state.selected_words) if old_game_state.selected_words else []
                guest_game_state.jumpsA = old_game_state.jumpsA if old_game_state.jumpsA else [[1,0,0,0,0,1],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0]]
                guest_game_state.total_jumps = old_game_state.total_jumps
                guest_game_state.results = old_game_state.results if old_game_state.results else []
                guest_game_state.prompt_idx = old_game_state.prompt_idx
                guest_game_state.current_jumps = old_game_state.current_jumps
                guest_game_state.prompts = old_game_state.prompts if old_game_state.prompts else []
            db.session.commit()

    # Set the auth cookie to the new guest user
    token = cookie_signer.dumps({"user_id": new_user.id})
    response = jsonify({"message": "Logged out successfully"})
    if app.debug:
        # Local development
        response.set_cookie(
            "auth_token",
            token,
            httponly=True,
            secure=False,
            samesite="Lax",
            domain="127.0.0.1",
            max_age=60 * 60 * 24 * 365
        )
    else:
        # Production
        response.set_cookie(
            "auth_token",
            token,
            httponly=True,
            secure=True,
            samesite="None",
            domain=".word.golf",
            max_age=60 * 60 * 24 * 365
        )
    return response



def login_google():
    # redirect_uri = url_for('authorize_google', _external=True) use this for local development
    redirect_uri = "https://routes.word.golf/authorize/google" # production
    # redirect_uri = "http://127.0.0.1:7000/authorize/google" # development
    return oauth.google.authorize_redirect(redirect_uri)


def authorize_google():
    token = oauth.google.authorize_access_token()
    user_info = oauth.google.get('userinfo').json()
    current_user = get_user_from_cookie()


    # Check if a user with the same email already exists
    user = User.query.filter_by(email=user_info.get('email')).first()
    if user:
        # If the user exists but doesn't have provider info, update it
        if not user.provider or not user.provider_id:
            user.provider = 'google'
            user.provider_id = user_info['id']
            db.session.commit()
    else:
        # Create a new user if no user with the email exists
        user = User(
            id=str(uuid.uuid4()),
            provider='google',
            provider_id=user_info['id'],
            email=user_info.get('email'),
            date_created=datetime.utcnow().date(),
            streak=0,
            last_date_completed=None
        )

        db.session.add(user)
        db.session.commit()
    
    if current_user:
        date_today = datetime.utcnow().date()
        game_state = GameState.query.filter_by(user_id=current_user.id, current_date=date_today).first()
        if game_state:
            existing = GameState.query.filter_by(user_id=user.id, current_date=game_state.current_date).first()
            if existing:
                print(f"existing GameState: id={existing.id}, user_id={existing.user_id}, current_date={existing.current_date}, "
                        f"selected_words={existing.selected_words}, jumpsA={existing.jumpsA}, total_jumps={existing.total_jumps}, "
                        f"results={existing.results}, prompt_idx={existing.prompt_idx}, current_jumps={existing.current_jumps}, "
                        f"prompts={existing.prompts}")
            else:
                print("existing GameState: None")

            # need to update the previous words to update the user's streak
            if game_state and not existing and game_state.selected_words and game_state.prompts and game_state.prompts[-1]:
                
                if game_state.selected_words[-1] == game_state.prompts[-1][-1]:
                    # update the user's streak and other metrics (we just finished a day)
                    if game_state.current_date != user.last_date_completed: # if it is the same do nothing 
                        game_state.user_id = user.id

                        # Update the user's streak based on the last date completed
                        if user.last_date_completed:
                            if user.last_date_completed == game_state.current_date - timedelta(days=1):
                                user.streak += 1  # Increment streak if the last date was yesterday
                            elif user.last_date_completed < game_state.current_date - timedelta(days=1):
                                user.streak = 1  # Reset streak if the last date was more than a day ago
                        else:
                            # if the user has never completed a game, set streak to 1
                            user.streak = 1
                        # If the last date is the same as the game date, do nothing (explicitly handled)

                        # Update user's streak and last date
                        user.last_date_completed = game_state.current_date
                        db.session.commit()

    token = cookie_signer.dumps({"user_id": user.id})
    # response = redirect("https://dev.word.golf") # production version
    response = redirect("https://word.golf")
    # print("REDIRECTING TO HERE!!!!!")
    # response = redirect("http://127.0.0.1:8080") # development version
    if app.debug:
        # Local development
        response.set_cookie(
            "auth_token",
            token,
            httponly=True,
            secure=False,
            domain="127.0.0.1",
            samesite="Lax",
            max_age=60 * 60 * 24 * 365
        )
    else:
        # Production
        response.set_cookie(
            "auth_token",
            token,
            httponly=True,
            secure=True,
            samesite="None",
            domain=".word.golf",
            max_age=60 * 60 * 24 * 365
        )
    return response


@app.route("/user_exist", methods=["POST"])
def user_exist():
    data = request.get_json() 
    email = data.get("email") 

    if not email:
        return jsonify({"error": "Email is required"}), 400 

    user = User.query.filter_by(email=email).first()

    if user:
        return jsonify({"exists": True}), 200
    else:
        return jsonify({"exists": False}), 200

