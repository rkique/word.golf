from datetime import date
import datetime
from ..utils import get_prompts, txt_to_list, txt_to_dict

#Global user-specific today across application.
today = date.today()

#Global start date
start_date = datetime.datetime.strptime("05-30-2025", '%m-%d-%Y').date()

# Load PRECOMPUTED first to filter invalid prompts
PRECOMPUTED = txt_to_dict("application/data/top_100_w2v.csv")

# Load all prompts and filter to only those with words in PRECOMPUTED
prompt_neighbor_dict = get_prompts(txt_to_list("application/data/neighbors.txt"))
valid_prompts = {}
for (start, target), neighbor in prompt_neighbor_dict.items():
    if start in PRECOMPUTED and target in PRECOMPUTED:
        valid_prompts[(start, target)] = neighbor
    else:
        missing = [w for w in [start, target] if w not in PRECOMPUTED]
        print(f'[globals] Filtering out prompt ({start}, {target}) - missing words: {missing}')

PROMPTS = list(valid_prompts.keys())
NEIGHBORS = list(valid_prompts.values())
print(f'[globals] Loaded {len(PROMPTS)} valid prompts (filtered {len(prompt_neighbor_dict) - len(valid_prompts)})')

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
