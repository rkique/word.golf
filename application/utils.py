import pandas as pd
import numpy as np
import random 
import ast
from functools import partial

LAZY_EXCLUDE = ["fuckable", "shitshow", "jegging", "daddy", "brat",
                "dominatrix"," hotness"," sexiness"," perky"," kissable"," fatale"," seductive", "aybe",
                  "orgasmed", "sodomized", "sodomize", "kinkier", "ravish", "ravage",
                  "mindfuck","perv","foreplay","makeout","polyamorous", "sexting", "pippin"
                ]

LAZY_EXCLUDE_RACE = ["blood", "condom", ]
N_LIMIT = 100


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

#finds subset of min length and appends min word to subset.
def partition(words, buckets=7):
    words_sorted = sorted(words, key=len, reverse=True)
    subsets = [[] for _ in range(0,buckets)]
    lengths = [0] * buckets
    for word in words_sorted:
        candidates = [(i, l) for i, l in enumerate(lengths) if len(subsets[i]) < 3]
        min_idx = min(candidates, key=lambda x: x[1])[0]
        subsets[min_idx].append(word)
        lengths[min_idx] += len(word)
    return subsets


def similarity(word1 : str, word2 : str, wv: dict) -> float:
    """
    Calculate the cosine similarity between two words based on their vectors.
    """
    if word1 == '<SKIPPED>' or word2 == '<SKIPPED>':
        return 0.0
    vec1 = wv[word1]
    vec2 = wv[word2]
    if vec1 is None or vec2 is None:
        return 0.0
    return np.dot(vec1, vec2)

#accepts a list of strings of the form, 'start,neighbor,target'
def get_prompts(l):
    p = {tuple([start, target]): neighbor for start, neighbor, target in (w.split(',') for w in l)}
    return p


def backoff_selection(indices, start_neighbors: list[str], mode=2, num=20) -> list[str]:
    n = len(start_neighbors)
    if mode == 2: #easier
        exp = 2
        for x in range(num * 2):
            i = int((x / (num * 2 - 1)) ** exp * (n - 1))
            if i not in indices:
                indices.append(i)
            if len(indices) == num:
                break
    else: #race mode (define at least 8 (3x3) --> 14 indices (5x3)
        #this is 7 good, 10 bad.
        get_idxs = [1, 2, 5, 6, 7, 8, 9, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49]
        for x in range(len(get_idxs)):
            i = get_idxs[x]
            if i not in indices:
                indices.append(i)
            if len(indices) == num:
                print(f'[hard spaced] {indices}')
                break
    # Select items based on generated indices
    selected = [start_neighbors[i] for i in indices if i < len(start_neighbors)]
    return selected

def get_curve(word : str, target: str, PRECOMPUTED: dict, WV : dict, mode=2, num=20, neighbor=None) -> list[str]:
    '''
    Returns neighbors of the word which are biased towards the target.
    ''' 

    start_neighbors = [result for result in PRECOMPUTED[word] if result not in LAZY_EXCLUDE][:N_LIMIT]
    target_neighbors = [result for result in PRECOMPUTED[target] if result not in LAZY_EXCLUDE][:N_LIMIT]
    similarity_to_target = partial(similarity, word2=target, wv=WV)

    indices = []

    sorted_start_neighbors = sorted(start_neighbors, key=similarity_to_target, reverse=True)

    if neighbor is not None:
        print(f'[Neighbor] {neighbor}')
        assert neighbor in start_neighbors, "Neighbor must be in results"
        neighbor_idx = start_neighbors.index(neighbor)
        indices.append(neighbor_idx)

    # target_candidates = start_neighbors
    # if mode == 1:
    #     target_candidates = start_neighbors[0:100]
    if target in sorted_start_neighbors:
        print(f"[Target]")
        target_idx = sorted_start_neighbors.index(target)
        indices.append(target_idx)

    elif word in target_neighbors and mode == 2:
        print(f"[Start in TargetN]")
        start_neighbors.append(target)
        indices.append(len(start_neighbors) - 1)

    elif mode == 3:
        start_neighbors.append(sorted_start_neighbors[20])
        indices.append(len(start_neighbors) - 1)

    results__biased = []
    if mode == 3: #No bias.
        for i in range(0, num * 2):
            if i not in indices:
                indices.append(i)
            if len(indices) == num:
                break
        results__biased = [start_neighbors[i] for i in indices if i < len(start_neighbors)]
    else:
        #exponential backoff from 0 to 100
        results__biased = backoff_selection(indices, sorted_start_neighbors,\
                                           mode=mode, num=num)
        print(results__biased)
    random.seed(len(word))
    random.shuffle(results__biased)
    results__biased.append(word)
    buckets = int((num + 1) / 3)
    subsets = partition(results__biased, buckets)
    #word is not in subset.
    for i, subset in enumerate(subsets):
        if word in subset:
            word_subset = subset
            word_index = i
            break
    subsets.pop(word_index)
    others = [w for w in subset if w != word]
    word_subset = [others[0], word, others[1]]
    # 7 --> insert before 7 // 2
    # 3 --> insert before 3 // 2
    subsets.insert(buckets // 2, word_subset)
    results = [item for sublist in subsets for item in sublist]
    return results


