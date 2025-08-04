import pandas as pd
import numpy as np
import random 
import ast

LAZY_EXCLUDE = ["fuckable", "shitshow", "jegging", "daddy", "brat",
                "dominatrix"," hotness"," sexiness"," perky"," kissable"," fatale"," seductive", "aybe",
                  "orgasmed", "sodomized", "sodomize", "kinkier", "ravish", "ravage",
                  "mindfuck","perv","foreplay","makeout","polyamorous", "sexting", "pippin"
                ]

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
def partition(words):
    assert len(words) == 21
    words_sorted = sorted(words, key=len, reverse=True)
    subsets = [[] for _ in range(0,7)]
    lengths = [0] * 7
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


def generate_indices(n: int, num: int,indices,seen, mode=2) -> list[int]:
    '''
    n: total number of items
    num: number of indices to generate
    '''
    if mode == 2: #easier
        exp = 2
        for x in range(num * 2):
            i = int((x / (num * 2 - 1)) ** exp * (n - 1))
            if i not in seen:
                seen.add(i)
                indices.append(i)
            if len(indices) == num:
                return indices
    else: #harder
        for x in range(num * 2):
            i = x * 3
            if i not in seen:
                indices.append(i)
                seen.add(i)
            if len(indices) == num:
                return indices
    return None
    
def backoff_selection(start, target, start_neighbors: list[str], target_neighbors: list[str],\
                      mode=2, num=20, neighbor=None) -> list[str]:
    '''
    Given an array of text in results,
    Selects a subarray of a specified number, with an exponential backoff.
    '''

    indices = []
    seen = set()
    if neighbor is not None:
        # print(f'neighbor: {neighbor}, target:{target}, results: {results}')
        print(f'[Neighbor] {neighbor}')
        assert neighbor in start_neighbors, "Neighbor must be in results"
        neighbor_idx = start_neighbors.index(neighbor)
        seen.add(neighbor_idx)
        indices.append(neighbor_idx)

    #If target among 100, append immediately.
    if target in start_neighbors:
        print(f"[Target]")
        target_idx = start_neighbors.index(target)
        seen.add(target_idx)
        indices.append(target_idx)

    elif start in target_neighbors:
        print(f"[Start in TargetN]")
        start_neighbors.append(target)
        neighbor_idx = len(start_neighbors) - 1
        seen.add(neighbor_idx)
        indices.append(neighbor_idx)

    n = len(start_neighbors)
    # Generate indices with exponential backoff
    generate_indices(n, num, indices, seen, mode=mode)
    selected = [start_neighbors[i] for i in indices]
    return selected

def get_curve(word : str, target: str, PRECOMPUTED: dict, WV : dict, mode=2, neighbor=None) -> list[str]:
    '''
    Returns neighbors of the word which are biased towards the target.
    Linear Bias (1) is easiest, Exponential Backoff (2) is harder, Linear Select (3) is hardest.
    ''' 
    start_neighbors = [result for result in PRECOMPUTED[word] if result not in LAZY_EXCLUDE][:N_LIMIT]
    target_neighbors = [result for result in PRECOMPUTED[target] if result not in LAZY_EXCLUDE][:N_LIMIT]
    def similarity_to_target(x): 
        return similarity(x, target, WV)
    if mode == 3:
        results__biased = start_neighbors[0:20]
        results__biased.insert(10, word)
    else:
        start_neighbors.sort(key=similarity_to_target, reverse=True)
        #exponential backoff from 0 to 100
        results__biased = backoff_selection(word, target, start_neighbors, target_neighbors,\
                                            neighbor=neighbor, mode=mode)
        random.seed(len(word))
        random.shuffle(results__biased)
        results__biased.insert(10,word)
    subsets = partition(results__biased)
    for i, subset in enumerate(subsets):
        if word in subset:
            word_subset = subset
            word_index = i
            break
    subsets.pop(word_index)
    others = [w for w in subset if w != word]
    word_subset = [others[0], word, others[1]]
    subsets.insert(3, word_subset)
    results = [item for sublist in subsets for item in sublist]
    return results


