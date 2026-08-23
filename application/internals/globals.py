from datetime import date
import datetime
from ..utils import txt_to_list, txt_to_dict

#Global user-specific today across application.
today = date.today()

#Global start date
start_date = datetime.datetime.strptime("05-30-2025", '%m-%d-%Y').date()

# Load PRECOMPUTED first to filter invalid prompts
PRECOMPUTED = txt_to_dict("application/data/top_100_w2v.csv")

# Load all prompts (as an ordered list, not a dict) and filter to only those
# with words in PRECOMPUTED. Kept as a list rather than deduped into a dict
# keyed by (start, target) so repeated rows in neighbors.txt still count as
# distinct daily-prompt slots.
raw_rows = [row.split(',') for row in txt_to_list("application/data/neighbors.txt")]
PROMPTS = []
NEIGHBORS = []
filtered_count = 0
for start, neighbor, target in raw_rows:
    if start in PRECOMPUTED and target in PRECOMPUTED:
        PROMPTS.append((start, target))
        NEIGHBORS.append(neighbor)
    else:
        filtered_count += 1
        missing = [w for w in [start, target] if w not in PRECOMPUTED]
        print(f'[globals] Filtering out prompt ({start}, {target}) - missing words: {missing}')

print(f'[globals] Loaded {len(PROMPTS)} valid prompts (filtered {filtered_count})')

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
