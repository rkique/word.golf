from ..utils import get_curve, get_furthest_away_word, get_similar_word, find_common_neighbor, similarity
from flask import Blueprint,render_template, request, make_response, jsonify
from ..internals import globals
from ..internals.auth import get_user_from_cookie
from ..models import UserConstructedGamestate
from .. import db, oauth, cookie_signer

createprompt_bp = Blueprint('createPrompt', __name__)

@createprompt_bp.route('/next_word', methods=['POST'])
def next_word():
    data = request.get_json()
    start_word = data["start_word"]
    neighbor = None
    target_word = data["end_word"]
    score = 0
    if "neighbor" in data:
        neighbor = data["neighbor"]
    else:
        # calculate the score 
        score = similarity(start_word, target_word, globals.WV)
    new_data = {}
    new_data["results"] = get_curve(start_word, target_word, globals.PRECOMPUTED, globals.WV, neighbor=neighbor)
    new_data["score"] = score
    return make_response(new_data)

@createprompt_bp.route('/create-prompt', methods=['GET'])
def create_own_prompt():
    return render_template('create-prompt.html')

@createprompt_bp.route('/check-new-prompts', methods=['POST'])
def check_new_prompts():
    data = request.get_json()
    if not data or not "word" in data or not "isStartWord" in data:
        return jsonify({"error": "Start and End words are required"}), 400
    
    start_word = None
    end_word = None
    is_start_word = data["isStartWord"]
    if is_start_word:
        start_word = get_similar_word(data["word"], globals.PRECOMPUTED, globals.WV)
    else:
        end_word = get_similar_word(data["word"], globals.PRECOMPUTED, globals.WV)
    
    if start_word:
        end_word = get_furthest_away_word(start_word, globals.PRECOMPUTED, globals.WV)
    else:
        start_word = get_furthest_away_word(end_word, globals.PRECOMPUTED, globals.WV)
    
    common_neighbors = find_common_neighbor(start_word, end_word, globals.PRECOMPUTED)

    common_neighbor = list(common_neighbors)[0]

    results = get_curve(start_word, end_word, globals.PRECOMPUTED, globals.WV, neighbor=common_neighbor)

    return_data = {}
    return_data["results"] = results
    return_data["start_word"] = start_word
    return_data["target_word"] = end_word
    return_data["neighbor"] = common_neighbor

    return make_response(return_data)


@createprompt_bp.route('/generate-gamestate-and-url', methods=['POST'])
def generate_url():
    data = request.get_json()
    if not data or not "prompts" in data:
        return 
    user = get_user_from_cookie()
    if not user:
        return 
    
    base_url = request.host_url.rstrip('/')
    # Get the max game_id from the database and add 1 to it
    max_game = UserConstructedGamestate.query.order_by(UserConstructedGamestate.game_id.desc()).first()
    if max_game:
        new_game_id = str(int(max_game.game_id) + 1)
    else:
        new_game_id = "1"

    new_gamestate = UserConstructedGamestate(
        user_creator_id=user.id,
        url=base_url + '/custom?game=' + new_game_id,
        game_id=new_game_id,
        user_player_id=user.id,
        prompts=data["prompts"],
    )

    db.session.add(new_gamestate)
    db.session.commit()

    # class UserConstructedGamestate(db.Model): 
    # id = db.Column(db.Integer, primary_key=True)
    # user_creator_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    # url = db.Column(db.String(36), nullable=True) # this is guaranteed to be unique (should be unique at least)
    # game_id = db.Column(db.String(36), nullable=False)
    # user_player_id = db.Column(db.String(36), nullable=False)
    # current_date = db.Column(db.Date, nullable=True) # this should be date that is generated when another user plays your game 
    # selected_words = db.Column(MutableList.as_mutable(JSON), nullable=False, default=[])
    # jumpsA = db.Column(MutableList.as_mutable(JSON), nullable=True)
    # total_jumps = db.Column(db.Integer, default=0)
    # results = db.Column(MutableList.as_mutable(JSON), nullable=True)
    # prompt_idx = db.Column(db.Integer, nullable=True) # make migration that removes this
    # current_jumps = db.Column(db.Integer, default=0) # make migration that removes this
    # prompts = db.Column(MutableList.as_mutable(JSON), nullable=True) # make migration that removes this
    # start_target_idxs = db.Column(MutableList.as_mutable(JSON), nullable=True, default=[[0,0], [0,5]])
    new_url_data = {}
    new_url_data["url"] = base_url + '/custom?game=' + new_game_id
    return make_response(new_url_data)

@createprompt_bp.route('/custom', methods=['GET'])
def custom_index():
    # use search params to see/determine which 
    return make_response(render_template('index.html'))
