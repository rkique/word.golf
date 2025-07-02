from .. import db, mail
from flask import current_app as app, jsonify, request
from ..models import User, PasswordResetPin
import random
from flask_mail import Message
import os
from datetime import datetime, timedelta
from crypto import generate_salt, PasswordKDF, Hash


def generate_pin(length=6):
    return ''.join(str(random.randint(0, 9)) for _ in range(length))


def send_reset_pin_email(to_email, pin):
    msg = Message(
        subject="Word Golf Password Reset PIN",
        sender=os.environ.get('MAIL_USER'),
        recipients=[to_email]
    )
    msg.body = f"Your password reset PIN is: {pin}. It will expire in 15 minutes. Please do not share this PIN with anyone. \n Best regards, \n Word Golf Team"
    mail.send(msg)

@app.route('/forgot_password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

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

    return jsonify({"message": "Reset PIN sent via email."})

@app.route('/reset_password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email')
    pin = data.get('pin')
    new_password = data.get('new_password')

    if not email or not pin or not new_password:
        return jsonify({"error": "Email, PIN and new password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

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

    return jsonify({"message": "Password reset successful."})
