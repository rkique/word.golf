import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm
import csv
from utils import WordFilter
from gensim.models import KeyedVectors

def generate_embeddings(vocab_size=40000, 
    top_k=120,
    model="sentence-transformers/all-mpnet-base-v2", 
    word_filter=None):
    '''
    Generate embeddings for the top N words in English and save them to a CSV file.
    Generate similarity neighbors for each word and save them to a separate CSV file.
    '''

    gbooks_df = pd.read_csv("freq_gbooks/en_gbooks_500k_freqs.csv")
    vocab = gbooks_df['word'].head(vocab_size).tolist()[1:]
    vocab = [str(word) for word in vocab]
    # vocab = top_n_list('en', vocab_size)
    print(f'Initial vocabulary size: {len(vocab)}')

    if word_filter:
        vocab = word_filter.filter(vocab)
    print(f'Filtered vocabulary size: {len(vocab)}')

    if model == "w2v":
        filename = "w2v"
        load_path = "w2v/gnews_w2v_300.kv"
        embeddings = KeyedVectors.load(load_path)
        vocab = [word for word in vocab if word in embeddings.key_to_index]
        embeddings = np.array([embeddings[word] for word in vocab])
    
    else:
        filename = model.split("/")[-1]
        model = SentenceTransformer(model)
        print(f'Generating embeddings with model: {model.__class__.__name__}')
        embeddings = model.encode(vocab, batch_size=512, show_progress_bar=True)

    normed = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
    print("Calculating cosine similarity")
    cos_sim = cosine_similarity(normed)

    df = pd.DataFrame({
        'word': vocab,
        'vector': [vec.tolist() for vec in normed]
    })
    df.to_csv(f"embed_{filename}.csv", index=False)

    # generate neighbors for each word
    print(f'Generating neighbors for each word, top {top_k} neighbors')
    neighbors = []
    for i in tqdm(range(len(vocab))):
        sim_scores = cos_sim[i]
        sim_scores[i] = -np.inf
        top_indices = np.argpartition(sim_scores, -top_k)[-top_k:]
        top_sorted = top_indices[np.argsort(-sim_scores[top_indices])]
        neighbor_words = [vocab[j] for j in top_sorted]
        neighbors.append([vocab[i]] + neighbor_words)

    df = pd.DataFrame(neighbors)
    df.to_csv(f"top_{top_k}_{filename}.csv", index=False, header=False)

if __name__ == "__main__":
    # Generate embeddings for the top 100,000 words with a word filter
    word_filter = WordFilter(min_length=3,max_length=12)
    generate_embeddings(100000, 100, model="w2v", word_filter=word_filter)