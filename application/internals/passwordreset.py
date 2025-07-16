from .. import db, mail, cookie_signer
from flask import current_app as app, jsonify, request, session
from ..models import User, PasswordResetPin, GameState
import random
from flask_mail import Message
import os
from datetime import datetime, timedelta
from .crypto import generate_salt, PasswordKDF, Hash
from .auth import get_user_from_cookie, get_last_nonzero_row
from . import today


# DO NOT USE GLOBAL DATE FOR THIS CASE (needs to be real time date)

def generate_pin(length=6):
    return ''.join(str(random.randint(0, 9)) for _ in range(length))

def send_reset_pin_email(to_email, pin):
    msg = Message(
        subject="Reset your word.golf password",
        sender=os.environ.get('MAIL_USER'),
        recipients=[to_email]
    )
    msg.body = f"Your password reset PIN is: {pin}. Please do not share this PIN with anyone."
    mail.send(msg)

@app.route('/forgot_password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 400

    pin = generate_pin()
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    existing = PasswordResetPin.query.filter_by(user_id=user.id).first()
    if existing:
        existing.pin = pin
        existing.expires_at = expires_at
    else:
        reset_pin = PasswordResetPin(user_id=user.id, pin=pin, expires_at=expires_at)
        db.session.add(reset_pin)
    db.session.commit()

    send_reset_pin_email(email, pin)

    return jsonify({"message": "Check your email for a reset PIN"})

@app.route('/reset_password', methods=['POST'])
def reset_password():
    current_user = get_user_from_cookie()
    data = request.get_json()
    email = data.get('email')
    pin = data.get('pin')
    new_password = data.get('new_password')

    if not email or not pin or not new_password:
        return jsonify({"error": "Email, PIN and new password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 400

    reset_pin = PasswordResetPin.query.filter_by(user_id=user.id, pin=pin).first()
    if not reset_pin or reset_pin.expires_at < datetime.utcnow():
        return jsonify({"error": "Invalid or expired PIN"}), 400

    salt = generate_salt(4)
    password_kdf = PasswordKDF(new_password, salt, 16)
    hashed_password = Hash(password_kdf)

    user.salt = salt
    user.password = hashed_password

    db.session.delete(reset_pin)
    db.session.commit()

    if current_user:
        game_state = GameState.query.filter_by(user_id=current_user.id, current_date=today.today).first()
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

    token = cookie_signer.dumps({"user_id": user.id})

    session["user_id"] = user.id

    response = jsonify({"message": "Password reset successful."})

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
