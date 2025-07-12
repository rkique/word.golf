from .. import db
from flask import current_app as app, request, jsonify, send_file
from ..models import GameState
from .auth import get_user_from_cookie
from dateutil import parser
from datetime import timedelta
from . import today
import statistics
from io import BytesIO
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# @app.route('/total_jumps_statistics', methods=['GET'])
# def total_jumps_statistics():
#     user = get_user_from_cookie()
#     if not user:
#         return jsonify({"error": "Not authenticated"}), 401
    
#     gamestates = GameState.query.filter_by(current_date=today.today).order_by(GameState.current_date.desc()).all()
#     total_jumps = [gamestate.total_jumps for gamestate in gamestates if gamestate.total_jumps > 0]

#     if not total_jumps:
#         return "No data for today", 404

#     mean = statistics.mean(total_jumps)
#     median = statistics.median(total_jumps)

#     plt.figure(figsize=(10, 6))
#     plt.hist(total_jumps, bins=15, density=False, edgecolor='black', alpha=0.4, label='Histogram')

#     plt.axvline(mean, color='black', linestyle='dashed', linewidth=1.2, label=f'Mean: {mean:.2f}')
#     plt.axvline(median, color='gray', linestyle='dotted', linewidth=1.2, label=f'Median: {median}')

#     plt.title('Total Jumps Distribution (Today)')
#     plt.xlabel('Total Jumps')
#     plt.ylabel('Number of Users')
#     plt.legend()

#     buf = BytesIO()
#     plt.savefig(buf, format='png')
#     plt.close()
#     buf.seek(0)

#     return send_file(buf, mimetype='image/png')

@app.route('/total_jumps_statistics', methods=['GET'])
def total_jumps_statistics():
    user = get_user_from_cookie()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    
    gamestates = GameState.query.filter_by(current_date=today.today).order_by(GameState.current_date.desc()).all()
    total_jumps = [gamestate.total_jumps for gamestate in gamestates if gamestate.total_jumps > 0]

    if not total_jumps:
        return jsonify({"error": "No data for today"}), 404

    # Calculate frequency of jumps (how many users have each total jump count)
    jump_counts = {}
    for jumps in total_jumps:
        jump_counts[jumps] = jump_counts.get(jumps, 0) + 1

    # Convert the dictionary into lists of jumps and frequencies
    jumps_values = list(jump_counts.keys())
    user_counts = list(jump_counts.values())

    return jsonify({
        'jumps_values': jumps_values,  # Unique jump counts
        'user_counts': user_counts     # Corresponding number of users for each jump count
    })



