from flask import current_app as app
from flask import render_template, request, session, make_response
from flask import Blueprint
from flask import redirect
from .main import WV, prompts_today, neighbors_today
from .main import get_state_model, get_existing_data, get_prompts_for_date, shift_to, add_days, load_data
from ..internals.auth import get_user_from_cookie
from .. import cookie_signer, db
from ..internals.globals import today
from ..internals.globals import DISPLAY_PRECISION, PROMPT_COUNT, BASE_JUMPS_ARRAY, BASE_START_TARGET_IDXS
from ..models import User

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/profile', methods=['GET'])
def profile():
    user = get_user_from_cookie()
    state_model = get_state_model()
    game_state = state_model.query.filter_by(user_id=user.id, current_date=today).first()
    # print(f'user game_state is {game_state}')
    # print(f'game state has keys and values {game_state.__dict__.keys()} and {game_state.__dict__.values()}')
    best_score = state_model.query.filter_by(user_id=user.id).order_by(state_model.total_jumps.asc()).first()
    if best_score:
        best_score = best_score.total_jumps
    else:
        best_score = game_state.total_jumps if game_state else 0
    
    total_games = state_model.query.filter_by(user_id=user.id).filter(state_model.total_jumps > 0).count()
    streak = user.streak if user.streak else 0
    if total_games > 0:
        average_total_jumps = round(state_model.query.filter_by(user_id=user.id).filter(state_model.total_jumps > 0).with_entities(db.func.avg(state_model.total_jumps)).scalar(), DISPLAY_PRECISION)
    else:
        average_total_jumps = game_state.total_jumps if game_state else 0
    
    total_jumps = state_model.query.filter_by(user_id=user.id).with_entities(db.func.sum(state_model.total_jumps)).scalar()
    if total_jumps is None:
        total_jumps = 0 
    average_jumps_per_prompt = round(total_jumps / (total_games * PROMPT_COUNT), DISPLAY_PRECISION) if total_games > 0 else 0

    # make an array of the total jumps over time (filtering from furthest date to today)
    game_states = state_model.query.filter_by(user_id=user.id).order_by(state_model.current_date.desc()).all()
    total_jumps_over_time = []
    total_jumps_average_per_date = []
    for gs in game_states:
        if gs.total_jumps == 0:
            continue
        else:
            relevant_game_states = state_model.query.filter_by(current_date=gs.current_date).all()
            total_jumps_for_date = 0
            number_of_game_states = 0
            if relevant_game_states:
                for g in relevant_game_states:
                    if g.total_jumps > 0:
                        number_of_game_states += 1
                    total_jumps_for_date += g.total_jumps
            total_jumps_average_per_date.append({
                'date': gs.current_date.strftime('%Y-%m-%d'),
                'average_jumps': total_jumps_for_date / number_of_game_states if number_of_game_states else 0
            })
            total_jumps_over_time.append({
                'date': gs.current_date.strftime('%Y-%m-%d'),
                'total_jumps': gs.total_jumps
            })
    total_jumps_over_time.reverse()
    total_jumps_average_per_date.reverse()

    # get the amount of games played this month
    games_and_dates_played_this_month = []
    games_this_month = state_model.query.filter(
        db.extract('year', state_model.current_date) == today.year,
        db.extract('month', state_model.current_date) == today.month,
        state_model.user_id == user.id,
        state_model.total_jumps > 0
    )

    for game in games_this_month:
        games_and_dates_played_this_month.append({
            'date': game.current_date.strftime('%Y-%m-%d')
        })
    
    jumpsArray_of_today_games = [
        game.jumpsA
        for game in state_model.query.filter(
            state_model.current_date == today,
            state_model.total_jumps > 0
        ).all()
    ]

    my_jumps_today = game_state.total_jumps if game_state else 0

    # get incomplete games this month
    incomplete_games_this_month = []
    incomplete_games = state_model.query.filter(
        db.extract('year', state_model.current_date) == today.year,
        db.extract('month', state_model.current_date) == today.month,
        state_model.user_id == user.id,
        state_model.total_jumps == 0,
        state_model.selected_words != []
    )
    for game in incomplete_games:
        incomplete_games_this_month.append({
            'date': game.current_date.strftime('%Y-%m-%d')
        })

    return render_template('profile.html', email=user.email, 
                           total_games=total_games, 
                           streak=streak,
                           average_total_jumps=average_total_jumps, 
                           average_prompt_jumps=average_jumps_per_prompt, 
                           best_score=best_score, 
                           jumps_data=total_jumps_over_time, 
                           jumps_average_data=total_jumps_average_per_date, 
                           month_stats=games_and_dates_played_this_month,
                           incomplete_games=incomplete_games_this_month,
                           today_jumps_stats=jumpsArray_of_today_games,
                           my_jumps_today=my_jumps_today)

#Gets the total jumps statistics for a particular day.
@stats_bp.route('/total_jumps_statistics_per_day', methods=['POST'])
def jump_statistics_per_day():
    user = get_user_from_cookie()
    if not user:
        return redirect('/')
    from datetime import datetime
    state_model = get_state_model()
    data = request.get_json()
    new_date_str = data.get('date') 
    new_date = datetime.strptime(new_date_str, '%Y-%m-%d').date()
    
    # Get all games for the specified date
    games_for_date = state_model.query.filter(
        state_model.current_date == new_date,
        state_model.total_jumps > 0
    ).all()
    
    jumpsArray_of_today_games = [game.total_jumps for game in games_for_date]

    result = state_model.query.filter(
        state_model.current_date == new_date,
        state_model.total_jumps > 0,
        state_model.user_id == user.id
    ).first()

    my_jumps_today = result.total_jumps if result else 0
    
    # Get prompts for the specified date to get starting words
    _, prompts_for_date, _ = get_prompts_for_date(new_date)
    starts = [prompt[0] for prompt in prompts_for_date]
    
    # Generate wordsArray for each user
    other_words_arrays = []
    for game in games_for_date:
        if game.selected_words and game.jumpsA:
            words_array = words_array_from_data(starts, game.selected_words, game.jumpsA)
            other_words_arrays.append(words_array)
    
    returned_data = {}
    returned_data['other_jumps'] = jumpsArray_of_today_games
    returned_data['my_jumps'] = my_jumps_today
    returned_data['other_words_arrays'] = other_words_arrays
    return make_response(returned_data)

@stats_bp.route('/per-jump-statistics', methods=['GET'])
def per_jump_statistics():
    game_date = today
    state_model = get_state_model()
    gamestates = state_model.query.filter_by(current_date=game_date).order_by(state_model.current_date.desc()).all()
    today_prompts = gamestates[0].prompts
    starting_words = []
    ending_words = []
    for prompt in today_prompts:
        starting_words.append(prompt[0])
        ending_words.append(prompt[1])
    counts = {}
    for i in range(5):
        counts[i] = {}
        for index in range(1, 13):
            counts[i][index] = {}
            for gamestate in gamestates:
                previous_jumps = 0
                i_cpy = i - 1
                while i_cpy >= 0:
                    previous_jumps += sum(gamestate.jumpsA[i_cpy]) - 1
                    i_cpy = i_cpy - 1
                current_jumps = sum(gamestate.jumpsA[i]) - 1 
                list_replacing_prompts = gamestate.selected_words
                if list_replacing_prompts:
                    if index > current_jumps or previous_jumps + index - 1 >= len(list_replacing_prompts):
                        continue
                    else:
                        if list_replacing_prompts[previous_jumps + index - 1]:
                            if list_replacing_prompts[previous_jumps + index - 1] in counts[i][index]:
                                counts[i][index][list_replacing_prompts[previous_jumps + index - 1]] += 1
                            else:
                                counts[i][index][list_replacing_prompts[previous_jumps + index - 1]] = 1
    print("Counts: ", counts)
    return make_response(counts)

@stats_bp.route('/user-statistics', methods=['GET'])
def user_statistics():
    user = get_user_from_cookie()
    if not user:
        return redirect('/login')
    state_model = get_state_model()
    
    game_state = state_model.query.filter_by(user_id=user.id, current_date=today).first()
    if not game_state:
        return redirect('/')

    # look for best score through all game states
    best_score = state_model.query.filter_by(user_id=user.id).order_by(state_model.total_jumps.asc()).first()
    if best_score:
        best_score = best_score.total_jumps
    else:
        best_score = game_state.total_jumps
    
    # get the total games played by user
    total_games = state_model.query.filter_by(user_id=user.id).count()

    # get the average jumps per game
    if total_games > 0:
        average_total_jumps = state_model.query.filter_by(user_id=user.id).with_entities(db.func.avg(state_model.total_jumps)).scalar()
    else:
        average_total_jumps = game_state.total_jumps

    # get the average jumps per prompt for all time
    total_jumps = state_model.query.filter_by(user_id=user.id).with_entities(db.func.sum(state_model.total_jumps)).scalar()
    if total_jumps is None:
        total_jumps = 0 
    average_jumps_per_prompt = total_jumps / (total_games * PROMPT_COUNT) if total_games > 0 else 0

    # of the LOGGED IN users (user.email is not None), get my 'leaderboard' position
    all_game_states = state_model.query.filter_by(current_date=today).order_by(state_model.total_jumps.asc()).all()
    current_user = user
    leaderboard = []
    for gs in all_game_states:
        if gs.total_jumps > 0:
            leaderboard.append(gs)

    my_jumps_position = leaderboard.index(game_state) if game_state in leaderboard else None

    # create a new list of just gamestate_ids and total_jumps
    real_leaderboard = []
    user_string = "user"
    for i in range(len(leaderboard)):
        game = leaderboard[i]
        new_obj = {
            'name': user_string,
            'total_jumps': game.total_jumps,
        }
        if i == my_jumps_position:
            new_obj['name'] = "You"

        real_leaderboard.append(new_obj)

    my_jumps_position = my_jumps_position + 1 if my_jumps_position is not None else None

    # of the LOGGED IN users (user.email is not None), get my leaderboard position for streaks
    users = User.query.all()
    streak_leaderboard = []
    for user in users:
        if user.email is None:
            continue
        streak_leaderboard.append(user)
    # sort by streak
    streak_leaderboard.sort(key=lambda u: u.streak, reverse=True)
    # print("Streak leaderboard: ", streak_leaderboard)
    my_streak_position = streak_leaderboard.index(current_user) if current_user in streak_leaderboard else None

    my_streak_position = my_streak_position + 1 if my_streak_position is not None else None

    return render_template('user-statistics.html', email=current_user.email, total_games=total_games,
                           average_total_jumps=average_total_jumps, 
                           average_prompt_jumps=average_jumps_per_prompt, 
                           total_jumps=game_state.total_jumps, best_score=best_score,
                           total_jumps_leaderboard=my_jumps_position,
                           total_streaks_leaderboard=my_streak_position,
                           real_leaderboard=real_leaderboard)

#Given start words, selected words from the database, and jumps array, return the actual word history for the user.
def words_array_from_data(starts, selected_words, jumps_array,is_help=False):
    # print(f'[words_array] {selected_words}')
    if is_help:
        return [['fruit', 'orchard', 'house', 'porch'],['whisper', 'shouting', 'scuffle']]
    result = []
    l_idx = 0
    for i, row in enumerate(jumps_array):
        r_idx = l_idx + sum(row) - 1
        subarray = [starts[i]] + selected_words[l_idx:r_idx]
        # print(subarray, l_idx, r_idx)
        result.append(subarray)
        l_idx = r_idx
    return result

@stats_bp.route('/replay-game', methods=['GET'])
def replay_game():
    # reset gamestate object and href to prev_index 
    user = get_user_from_cookie()
    if user:
        previous_gamestate = get_state_model().query.filter_by(user_id=user.id, current_date=today).first()
        if previous_gamestate:
            previous_gamestate.jumpsA = BASE_JUMPS_ARRAY
            previous_gamestate.results = []
            previous_gamestate.selected_words = []
            previous_gamestate.total_jumps = 0
            previous_gamestate.prompt_idx = 0
            previous_gamestate.current_jumps = 0
            previous_gamestate.start_target_idxs = BASE_START_TARGET_IDXS
        db.session.commit()
    return redirect('/past')