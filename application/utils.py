import pandas as pd
import numpy as np
import random 
import ast

random.seed(42)

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


def vector_for_word(word: str, df = pd.DataFrame) -> np.array:
    """
    Retrieve the vector for a given word from the DataFrame.
    """
    row = df[df['word'] == word]
    if not row.empty:
        return row.iloc[0]['vector']
    else:
        return None


def cosine_similarity(vec1 : np.array, vec2 : np.array) -> float:
    """
    Calculate the cosine similarity between two vectors.
    """
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    if norm_a == 0 or norm_b == 0:
        return 0.0 
    return dot_product / (norm_a * norm_b)

def similarity(word1 : str, word2 : str, df: pd.DataFrame) -> float:
    """
    Calculate the cosine similarity between two words based on their vectors.
    """
    vec1 = vector_for_word(word1, df)
    vec2 = vector_for_word(word2, df)
    if vec1 is None or vec2 is None:
        return 0.0
    return cosine_similarity(vec1, vec2)

def get_prompts(l):
    p = [w.split(',') for w in l]
    return p


def backoff_selection(results: list[str], target: str, exp=2, num=27):
    '''
    Given an array of text in results,
    Selects a subarray of a specified number, with an exponential backoff.
    '''
    n = len(results)
    indices = []
    seen = set()
    #If target among 100, append immediately.
    if target in results:
        target_idx = results.index(target)
        seen.add(target_idx)
        indices.append(target_idx)

    for x in range(num * 2):
        i = int((x / (num * 2 - 1)) ** exp * (n - 1))
        if i not in seen:
            seen.add(i)
            indices.append(i)
        if len(indices) == num:
            break
    
    selected = [results[i] for i in indices]
    return selected



def get_curve(word : str, target: str, PRECOMPUTED: dict, WV : pd.DataFrame) -> list[str]:
    '''
    Given a word and target, 
    Returns neighbors of the word which are biased towards the target.
    '''
    results = PRECOMPUTED[word]
    def similarity_to_target(x): 
        return similarity(x, target, WV)
    results.sort(key=similarity_to_target, reverse=True)

    #exponential backoff from 0 to 100
    results__biased = backoff_selection(results, target)
    random.shuffle(results__biased)
    results__biased.insert(0,word)
    return results__biased
