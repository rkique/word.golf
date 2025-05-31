import pandas as pd
import numpy as np
import random
import ast

def get_prompts(l):
    p = [w.split(',') for w in l]
    return p

def txt_to_set(path):
    txt_file = open(path, 'r', encoding="utf-8")
    txt = txt_file.readlines()
    txt = [x.strip() for x in txt]
    return set(txt)
    
def txt_to_list(path):
    txt_file = open(path, 'r', encoding="utf-8")
    txt = txt_file.readlines()
    txt = [x.strip() for x in txt]
    return txt

def txt_to_dict(path):
    pre = txt_to_list(path)
    pre = [rawlist.split(",") for rawlist in pre]
    return {wordlist[0]: wordlist[1:] for wordlist in pre}

MIN_FREQ = 16000

#Consider k lowest similarity neighbors
print("Loading word vectors")
WV = pd.read_csv("sbert/embed_all-MiniLM-L6-v2.csv")
WV['vector'] = WV['vector'].apply(lambda x: np.array(ast.literal_eval(x)))
VOCAB = set(WV['word'].values)
print("Loading precomputed neighbors")
PRECOMPUTED = txt_to_dict("sbert/neighbors_top100_ner_web_trf.txt")
print("Loading prompts")
POPULAR_VOCAB = txt_to_set("freq_gbooks/popular_vocab.txt")
print("Loading frequencies")
freqs = pd.read_csv("freq_gbooks/en_gbooks_500k_freqs.csv")
freqs_indexed = freqs.set_index('word')

def vector_for_word(word, df):
    row = df[df['word'] == word]
    if not row.empty:
        return row.iloc[0]['vector']
    else:
        return None
    
def get_freq(word : str, freqs : pd.DataFrame) -> int | None:
    '''
    Gets the frequency of a word from a DataFrame with 'word' and '2019_ct' columns.
    '''
    freq = freqs['2019_ct'].get(word)
    return int(freq) if pd.notna(freq) else 0
    
def cosine_similarity(vec1: np.array, vec2: np.array) -> float:
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    if norm_a == 0 or norm_b == 0:
        return 0.0 
    return dot_product / (norm_a * norm_b)

def similarity(word1, word2, df):
    vec1 = vector_for_word(word1, df)
    vec2 = vector_for_word(word2, df)
    
    if vec1 is None or vec2 is None:
        return 0.0
    return cosine_similarity(vec1, vec2)


def handle_missing_neighbors(start):
    print(f"No valid 2nd neighbors found for {start}")
    return None

def find_far_2nd_neighbor(start, WV, PRECOMPUTED, similarity, candidate_ct=8):
    """
    Find a second neighbor of a word that is not in the first neighbors.
    """
    if start not in PRECOMPUTED:
        print(f"{start} not in PRECOMPUTED neighbors.")
    
    first_neighbors = PRECOMPUTED[start]
    candidates = set()

    for neighbor in first_neighbors:
        for n2 in PRECOMPUTED.get(neighbor, []):
            if n2 != start and n2 not in first_neighbors:
                candidates.add(n2)
    candidates = [w for w in candidates if w in VOCAB]
    candidates = [w for w in candidates if w in POPULAR_VOCAB]
    if not candidates: handle_missing_neighbors(start)

    candidates.sort(key=lambda w: similarity(w, start, WV))
    #we can grab a list of neighbors which are common with low freq.
    candidates = [w for w in candidates if get_freq(w, freqs_indexed) > MIN_FREQ]
    candidates = candidates[0:candidate_ct]
    if not candidates: handle_missing_neighbors(start)
    random.shuffle(candidates)
    target = candidates[0]
    print(f'{start},{target},{similarity(target, start, WV)}')
    #write to file
    with open(f"2nd_neighbors_freq_biased_{MIN_FREQ}.txt", "a") as f:
        f.write(f"{start},{target},{similarity(target, start, WV)}\n")

import math
import pandas as pd
from collections import defaultdict

def process_gbooks_file_with_merge(filepath, top_n=500000):

    total_usage_by_year = defaultdict(int)
    #instantiates a dictionary for each word
    usage_by_word = defaultdict(lambda: {1970: 0, 2000: 0, 2019: 0})

    #write total counts.
    with open(filepath, 'r') as f:
        for line in f:
            parts = line.strip().split('\t')
            if len(parts) < 2:
                continue
            for entry in parts[1:]:
                try:
                    year, usage_count, _ = map(int, entry.split(','))
                    if year in {1970, 2000, 2019}:
                        total_usage_by_year[year] += usage_count
                except ValueError:
                    continue

    # Second pass: collect usage per base word
    with open(filepath, 'r') as f:
        for line in f:
            parts = line.strip().split('\t')
            if len(parts) < 2:
                continue

            raw_word = parts[0]
            word = raw_word.split('_')[0]  # strip POS tag

            for entry in parts[1:]:
                try:
                    year, count, _ = map(int, entry.split(','))
                    if year in {1970, 2000, 2019}:
                        usage_by_word[word][year] += count
                        # print(f"Processing word: {word}, year: {year}, count: {count}")
                except ValueError:
                    print(f"Skipping malformed entry: {entry}")
                    continue

    # Third pass: calculate frequencies
    result = []
    for word, usage in usage_by_word.items():
        # if usage[2019] == 0:
        #     continue
        logfreq = {}
        for y in [1970, 2000, 2019]:
            total = total_usage_by_year[y]
            count = usage[y]
            if total > 0:
                logfreq[y] = count / total
            else:
                logfreq[y] = 0  # or None if preferred
        result.append((word, logfreq[1970], logfreq[2000], logfreq[2019], usage[2019]))
    top_data = sorted(result, key=lambda x: x[3], reverse=True)[:top_n]
    df = pd.DataFrame(top_data, columns=["word", "1970", "2000", "2019", "2019_ct"])
    df.to_csv("freq_gbooks/en_gbooks_500k_freqs.csv", index=False)

def save_biased_vocab(df):
    # Filter based on absolute count and increasing trend
    absolute_ct = 5000
    increase_factor = 5
    filtered = df[
        (df["2019_ct"] > absolute_ct)
    ]
    #lowercase filter.
    sorted_words = filtered.sort_values("2019_ct", ascending=False)
    vocab_list = sorted_words["word"].tolist()
    output_path = f"biased_gbooks_vocab_abs_{absolute_ct}_inc_{increase_factor}.txt"
    with open(output_path, "w") as f:
        for word in vocab_list:
            f.write(f"{word}\n")

    print(f"Saved {len(vocab_list)} words to {output_path}")
    return vocab_list

if __name__ == "__main__":
    # process_gbooks_file_with_merge('freq_gbooks/1mil_gbooks.txt')
    # Example usage
    # save_biased_vocab(pd.read_csv("freq_gbooks/en_gbooks_500k_freqs.csv"))

    print(get_freq("apple", freqs_indexed))
    # print(get_freq("serendipity", freqs))
    # print(get_freq("pier", freqs))
    # print(get_freq("piers", freqs))

    start_words = list(PRECOMPUTED.keys())
    start_words = [w for w in start_words if get_freq(w, freqs_indexed) > MIN_FREQ]
    random.shuffle(start_words)
    #write (start, target, similarity) to file
    for start_word in start_words:
        find_far_2nd_neighbor(start_word, WV, PRECOMPUTED, similarity)
    