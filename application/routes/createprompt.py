from ..utils import get_curve, get_furthest_away_word, get_similar_word, find_common_neighbor, similarity
from flask import Blueprint,render_template, request, session, make_response, jsonify
from ..internals import globals
from .auth import create_guest_user, set_response_cookie
from .main import words_array_from_data, shift_to, get_existing_data, set_prompts_today_and_neighbors_today, load_data
from ..internals.auth import get_user_from_cookie
from ..models import UserConstructedGamestate, User
import json
import uuid
import os
from .. import db, cookie_signer

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
        return jsonify({"error": "prompts are required"}), 400
    user = get_user_from_cookie()
    if not user:
        return jsonify({"usererror": "user does not exist"}), 400
    
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
        user_id=user.id,
        prompts=data["prompts"],
    )

    db.session.add(new_gamestate)
    db.session.commit()

    new_url_data = {}
    new_url_data["url"] = base_url + '/custom?game=' + new_game_id
    return make_response(new_url_data)

def make_guest_user_custom(date, id, game_id):
    user = User(
        id=id,
        date_created=date,
        streak=0,
        last_date_completed=None
    )

    db.session.add(user)

    existing_gamestate = UserConstructedGamestate.query.filter_by(game_id=game_id).first()

    starting_game_state = UserConstructedGamestate(
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
        game_id=existing_gamestate.game_id,
        user_creator_id=existing_gamestate.user_creator_id,
        prompts=existing_gamestate.prompts
    )

    db.session.add(starting_game_state)
    db.session.commit()

    return user

def get_custom_prompts_and_neighbors(game_num):
    existing_gamestate = UserConstructedGamestate.query.filter_by(game_id=game_num).first()
    neighbors_list = []
    for prompt in existing_gamestate.prompts:

        common_neighbors = find_common_neighbor(prompt[0], prompt[1], globals.PRECOMPUTED)

        common_neighbor = list(common_neighbors)[0]

        neighbors_list.append(common_neighbor)

    return existing_gamestate.prompts, neighbors_list

@createprompt_bp.route('/custom', methods=['GET'])
def custom_index():
    # use search params to see/determine which custom game it is/are we playing
    custom_game_num = request.args.get('game', default=0, type=int)
    print(f'Custom game number: {custom_game_num}')
    globals.current_model = UserConstructedGamestate
    if not globals.PRECOMPUTED:
        load_data()
    prompts, neighbors = get_custom_prompts_and_neighbors(custom_game_num)
    set_prompts_today_and_neighbors_today(prompts, neighbors)
    data_or_none = get_existing_data(globals.current_model)
    #use the user object with updates from today's data.
    if data_or_none:
        data = data_or_none
        if data["results"] == []:
            # i = data.get('i', 0)
            data_today = shift_to(0)
            data_today['selected_words'] = []
            data_today['jumpsArray'] = globals.BASE_JUMPS_ARRAY
            data_today['startTargetIdxs'] = globals.BASE_START_TARGET_IDXS
            data_today['logged_in'] = data["logged_in"]
            data_today['total_jumps'] = 0
            data = data_today
        print("[custom_index] here is data prompts", data_or_none["prompts"])
        starts = [prompt[0] for prompt in data_or_none["prompts"]]
        data['wordsArray'] = words_array_from_data(starts, data['selected_words'],  data['jumpsArray'])
        data['is_help'] = False
        session['data'] = json.dumps(data)
        response = make_response(render_template('index.html', data=json.loads(session.get('data'))))
    else:
        print('Creating new user')
        guest_user = make_guest_user_custom(globals.today, str(uuid.uuid4()), custom_game_num)
        data = shift_to(0)
        data['jumpsArray'] = globals.BASE_JUMPS_ARRAY
        data['startTargetIdxs'] = globals.BASE_START_TARGET_IDXS
        data['is_help'] = False
        data['wordsArray'] = []
        session['data'] = json.dumps(data)
        response = make_response(render_template('index.html', data=json.loads(session.get('data'))))
        print("Here is my guest user id: ", guest_user.id)
        token = cookie_signer.dumps({"user_id": guest_user.id})

        if os.getenv("DEV", "false").lower() == "true":
            print("This Dev should NEVER BE TRUE!!!!!")
            set_response_cookie(response, token, secure=False)
        else:
            set_response_cookie(response, token, secure=True)
    return response
