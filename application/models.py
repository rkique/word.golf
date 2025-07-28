from . import db
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.dialects.mysql import JSON

class User(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    provider = db.Column(db.String(20), nullable=True)  # make a migration that removes this 
    provider_id = db.Column(db.String(128), nullable=True)  # ID from Google/Facebook
    email = db.Column(db.String(120), nullable=True, unique=True)
    password = db.Column(db.LargeBinary(64), nullable=True)
    salt = db.Column(db.LargeBinary(4), nullable=True)
    streak = db.Column(db.Integer, default=0)
    date_created = db.Column(db.Date, nullable=True)
    last_date_completed = db.Column(db.Date, nullable=True)

    __table_args__ = (
        db.UniqueConstraint("provider", "provider_id", name="uq_provider_providerid"), # remove provider -> make migration to do this 
    )

# stores the user's game state for a specific day -> change this to make it actually the full game state 
class GameState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    current_date = db.Column(db.Date, nullable=True) 
    selected_words = db.Column(MutableList.as_mutable(JSON), nullable=True)
    jumpsA = db.Column(MutableList.as_mutable(JSON), nullable=True)
    total_jumps = db.Column(db.Integer, default=0)
    results = db.Column(MutableList.as_mutable(JSON), nullable=True)
    prompt_idx = db.Column(db.Integer, nullable=True) # make migration that removes this
    current_jumps = db.Column(db.Integer, default=0) # make migration that removes this
    prompts = db.Column(MutableList.as_mutable(JSON), nullable=True) # make migration that removes this
    start_target_idxs = db.Column(MutableList.as_mutable(JSON), nullable=True, default=[[0,0], [0,5]])

    __table_args__ = (
        db.UniqueConstraint("user_id", "current_date", name="user_date_uc"),
    )

class PasswordResetPin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    pin = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)

# stores the generated gamestate for the user 
# class UserConstructedGamestate(db.Model): 
#     id = db.Column(db.Integer, primary_key=True)
#     user_creator_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
#     url = db.Column(db.String(36), nullable=True) # this is guaranteed to be unique (should be unique at least)
#     game_id = db.Column(db.String(36), nullable=False)
#     user_player_id = db.Column(db.String(36), nullable=False)
#     current_date = db.Column(db.Date, nullable=True) # this should be date that is generated when another user plays your game 
#     selected_words = db.Column(MutableList.as_mutable(JSON), nullable=True)
#     jumpsA = db.Column(MutableList.as_mutable(JSON), nullable=True)
#     total_jumps = db.Column(db.Integer, default=0)
#     results = db.Column(MutableList.as_mutable(JSON), nullable=True)
#     prompt_idx = db.Column(db.Integer, nullable=True) # make migration that removes this
#     current_jumps = db.Column(db.Integer, default=0) # make migration that removes this
#     prompts = db.Column(MutableList.as_mutable(JSON), nullable=True) # make migration that removes this
#     start_target_idxs = db.Column(MutableList.as_mutable(JSON), nullable=True, default=[[0,0], [0,5]])