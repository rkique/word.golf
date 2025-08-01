from flask import current_app as app
from flask import render_template, make_response, jsonify, request, session, redirect
from flask import Blueprint
import json
import datetime
from ..internals import globals
from ..internals.auth import get_user_from_cookie, get_last_nonzero_row
from ..models import User, GameState, FakeGameState
from cryptography.hazmat.primitives import constant_time
from datetime import datetime, timedelta
import uuid
import json
from .. import db, oauth, cookie_signer
from ..internals.crypto import Hash, PasswordKDF, generate_salt

auth_bp = Blueprint('auth', __name__)


def get_state_model():
    dev_mode = False # base mode in production
    host = request.host
    if host.startswith('localhost') or host.startswith('dev.word.golf') or host.startswith('127.0.0.1'):
        dev_mode = True
    print("here is dev mode: ", dev_mode)
    return FakeGameState if dev_mode else GameState


@auth_bp.route('/login', methods=['GET'])
def login():
    # this returns the login page stored at /templates/login.html
    date = globals.today.strftime('%Y-%m-%d') if globals.today else datetime.dateglobals.today().strftime('%Y-%m-%d')
    return render_template('login.html', date=date)

@auth_bp.route('/resetpassword', methods=['GET'])
def resetpassword():
    # this returns the password reset page stored at /templates/resetpassword.html
    date = globals.today.strftime('%Y-%m-%d') if globals.today else datetime.dateglobals.today().strftime('%Y-%m-%d')
    return render_template('resetpassword.html', date=date)


@auth_bp.route('/authlogin', methods=['POST'])
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
        token = cookie_signer.dumps({"user_id": user.id})
        # Find the game state using the user ID from the cookie
        if current_user:
            game_state = globals.current_model.query.filter_by(user_id=current_user.id, current_date=globals.today).first()
            if game_state:
                login_state = globals.current_model.query.filter_by(user_id=user.id, current_date=game_state.current_date).first()
                if login_state:
                    # check this one 
                    if get_last_nonzero_row(game_state.jumpsA) > get_last_nonzero_row(login_state.jumpsA):
                        db.session.delete(login_state)
                        db.session.commit()
                        game_state.user_id = user.id
                else:
                    game_state.user_id = user.id
                # need to update the previous words to update the user's streak
                if game_state and not login_state and game_state.selected_words and game_state.prompts and game_state.prompts[-1]:
                    
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
        if app.debug:
            response.set_cookie(
                "auth_token",
                token,
                path='/',
                httponly=True,
                samesite="Lax",
                max_age=60 * 60 * 24 * 365
            )
        else:
            response.set_cookie(
                "auth_token",
                token,
                # path='/',
                httponly=True,
                secure=True,
                samesite="None",
                domain=".word.golf",
                max_age=60 * 60 * 24 * 365
            )
        return response

    return jsonify({"error": "Invalid email or password"}), 401


@auth_bp.route('/authcreate', methods=['POST'])
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

    token = cookie_signer.dumps({"user_id": user.id})
    response = jsonify({"message": "User created and logged in successfully"})
    if app.debug:
        response.set_cookie(
            "auth_token",
            token,
            path='/',
            httponly=True,
            samesite="Lax",
            max_age=60 * 60 * 24 * 365
        )
    else:
        response.set_cookie(
            "auth_token",
            token,
            # path='/',
            httponly=True,
            secure=True,
            samesite="None",
            domain=".word.golf",
            max_age=60 * 60 * 24 * 365
        )
    
    return response

def create_guest_user(date, id, state_model):
    user = User(
        id=id,
        date_created=date,
        streak=0,
        last_date_completed=None
    )
    
    db.session.add(user)
    db.session.commit()

    starting_game_state = state_model(
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


def print_user(user):
    user_dict = {
        "id": user.id,
        "email": user.email,
        "streak": user.streak,
        "date_created": str(user.date_created) if user.date_created else None,
        "last_date_completed": str(user.last_date_completed) if user.last_date_completed else None,
    }
    print(json.dumps(user_dict))


def print_gamestate(gamestate):
    gamestate_dict = {
        "id": gamestate.id,
        "user_id": gamestate.user_id,
        "current_date": str(gamestate.current_date) if gamestate.current_date else None,
        "selected_words": gamestate.selected_words,
        "jumpsA": gamestate.jumpsA,
        "results": gamestate.results,
        "prompts": gamestate.prompts,
    }
    print(json.dumps(gamestate_dict))


@auth_bp.route("/logout", methods=["POST"])
def logout(): 
    new_user = create_guest_user(globals.today, str(uuid.uuid4()), globals.current_model)

    # Set the auth cookie to the new guest user
    token = cookie_signer.dumps({"user_id": new_user.id})
    session_data = json.loads(session["data"])
    session_data.clear()
    session["data"] = json.dumps(session_data)

    response = jsonify({"message": "Logged out successfully"})
    if app.debug:
        response.set_cookie(
            "auth_token",
            token,
            path='/',
            httponly=True,
            samesite="Lax",
            max_age=60 * 60 * 24 * 365
        )
    else:
        response.set_cookie(
            "auth_token",
            token,
            # path='/',
            httponly=True,
            secure=True,
            samesite="None",
            domain=".word.golf",
            max_age=60 * 60 * 24 * 365
        )
    return response


@auth_bp.route('/login/google', methods=['POST', 'GET'])
def login_google():
    # redirect_uri = url_for('authorize_google', _external=True) use this for local development
    # redirect_uri = "https://routes.word.golf/authorize/google" # production
    if app.debug:
        redirect_uri = "http://localhost:8080/authorize/google" # development
    else:
        redirect_uri = "https://word.golf/authorize/google"
    return oauth.google.authorize_redirect(redirect_uri)

@auth_bp.route('/authorize/google', methods=['POST', 'GET'])
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
            date_created=globals.today,
            streak=0,
            last_date_completed=None
        )

        db.session.add(user)
        db.session.commit()
    
    if current_user:
        game_state = GameState.query.filter_by(user_id=current_user.id, current_date=globals.today).first()
        if game_state:
            login_state = GameState.query.filter_by(user_id=user.id, current_date=game_state.current_date).first()
            if login_state:
                # check this one 
                if get_last_nonzero_row(game_state.jumpsA) > get_last_nonzero_row(login_state.jumpsA):
                    db.session.delete(login_state)
                    db.session.commit()
                    game_state.user_id = user.id
            else:
                game_state.user_id = user.id

            # need to update the previous words to update the user's streak
            if game_state and not login_state and game_state.selected_words and game_state.prompts and game_state.prompts[-1]:
                
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

    session["user_id"] = user.id
    token = cookie_signer.dumps({"user_id": user.id})

    # response = redirect("https://dev.word.golf") # production version
    # response = redirect("https://word.golf")
    if app.debug:
        response = redirect("http://localhost:8080") # development version
    else:
        response = redirect("https://word.golf")
    if app.debug:
        response.set_cookie(
            "auth_token",
            token,
            path='/',
            httponly=True,
            samesite="Lax",
            max_age=60 * 60 * 24 * 365
        )
    else:
        response.set_cookie(
            "auth_token",
            token,
            # path='/',
            httponly=True,
            secure=True,
            samesite="None",
            domain=".word.golf",
            max_age=60 * 60 * 24 * 365
        )
    return response


@auth_bp.route("/user_exist", methods=["POST"])
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

def user_session_exists():
    user = get_user_from_cookie()
    if user:
        return True
    else:
        return False
    

def set_response_cookie(response, token, secure):
    # if not secure:
    if not secure:
        response.set_cookie(
            "auth_token",
            token,
            path='/',
            httponly=True,
            samesite="Lax",
            max_age=60 * 60 * 24 * 365
        )
    else:
        response.set_cookie(
            "auth_token",
            token,
            # path='/',
            httponly=True,
            secure=True,
            samesite="None",
            domain=".word.golf",
            max_age=60 * 60 * 24 * 365
        )
    return response
