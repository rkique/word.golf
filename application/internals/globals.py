from datetime import date
import datetime
from ..utils import get_prompts, txt_to_list

#Global user-specific today across application.
today = date.today()

#Global start date
start_date = datetime.datetime.strptime("05-30-2025", '%m-%d-%Y').date()

prompt_neighbor_dict = get_prompts(txt_to_list("application/data/neighbors.txt"))
PROMPTS = list(prompt_neighbor_dict.keys())
NEIGHBORS = list(prompt_neighbor_dict.values())

BASE_JUMPS_ARRAY = [[1,0,0,0,0,1],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0]]

HELP_END_JUMPS_ARRAY = [[1,0,0,0,0,1],
                        [0,0,0,0,0,0],
                        [0,0,0,0,0,0],
                        [0,0,0,0,0,0],
                        [0,0,0,0,0,0]]

BASE_START_TARGET_IDXS = [[0,0], [0,5]]
DISPLAY_PRECISION = 1
PROMPT_COUNT = 5
DAYS = 0

SKIPPED_TOKEN = "<SKIPPED>"

HELP_PROMPTS = [["fruit", "porch"]]
HELP_NEIGHBORS = ["tree"]

THRESHOLDS = [0.2, 0.27, 0.35, 0.42]
WV = None
PRECOMPUTED = None
