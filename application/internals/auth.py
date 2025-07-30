from .. import db, oauth, cookie_signer
from flask import current_app as app, request, jsonify, redirect, session
from ..models import User, GameState, FakeGameState
import itsdangerous


def get_state_model():
    dev_mode = False # base mode in production

    host = request.host
    if host.startswith('localhost') or host.startswith('dev.word.golf') or host.startswith("127.0.0.1"):
        dev_mode = True

    return FakeGameState if dev_mode else GameState

def get_user_from_cookie(finish_request=None):
    if finish_request:
        token = finish_request.cookies.get("auth_token")
    else:
        token = request.cookies.get("auth_token")
    if not token:
        return None
    try:
        data = cookie_signer.loads(token, max_age=60 * 60 * 24 * 365) 
        return User.query.filter_by(id=data["user_id"]).first()
    except itsdangerous.BadSignature:
        return None

def get_last_nonzero_row(jumpsA):
    for i in reversed(range(len(jumpsA))):
        if any(jumpsA[i]):
            return i
    return len(jumpsA) -1
