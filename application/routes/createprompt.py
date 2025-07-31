from ..utils import get_curve, get_furthest_away_word, get_similar_word, find_common_neighbor
from flask import Blueprint,render_template, request, make_response, jsonify
from ..internals.globals import WV, PRECOMPUTED

createprompt_bp = Blueprint('createPrompt', __name__)

@createprompt_bp.route('/next_word', methods=['POST'])
def next_word():
    data = request.get_json()
    start_word = data["start_word"]
    neighbor = None
    if "neighbor" in data:
        neighbor = data["neighbor"]
    target_word = data["end_word"]
    new_data = {}
    new_data["results"] = get_curve(start_word, target_word, PRECOMPUTED, WV, neighbor=neighbor)
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
        start_word = get_similar_word(data["word"], PRECOMPUTED, WV)
    else:
        end_word = get_similar_word(data["word"], PRECOMPUTED, WV)
    
    if start_word:
        end_word = get_furthest_away_word(start_word, PRECOMPUTED, WV)
    else:
        start_word = get_furthest_away_word(end_word, PRECOMPUTED, WV)
    
    common_neighbors = find_common_neighbor(start_word, end_word, PRECOMPUTED)

    common_neighbor = list(common_neighbors)[0]

    results = get_curve(start_word, end_word, PRECOMPUTED, WV, neighbor=common_neighbor)

    return_data = {}
    return_data["results"] = results
    return_data["start_word"] = start_word
    return_data["target_word"] = end_word
    return_data["neighbor"] = common_neighbor

    return make_response(return_data)
