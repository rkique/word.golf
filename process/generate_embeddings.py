import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from wordfreq import top_n_list
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm
import csv
from utils import WordFilter

def generate_embeddings(vocab_size=40000, 
    top_k=120,
    model="sentence-transformers/all-MiniLM-L6-v2", 
    word_filter=None):
    '''
    Generate embeddings for the top N words in English and save them to a CSV file.
    Generate similarity neighbors for each word and save them to a separate CSV file.
    '''

    vocab = top_n_list('en', vocab_size)

    if word_filter:
        vocab = word_filter.filter(vocab)

    filename = model.split("/")[-1]
    model = SentenceTransformer(model)
    embeddings = model.encode(vocab, batch_size=512, show_progress_bar=True)
    normed = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
    cos_sim = cosine_similarity(normed)

    df = pd.DataFrame({
        'word': vocab,
        'vector': [vec.tolist() for vec in normed]
    })
    df.to_csv(f"test_sbert/embed_{filename}.csv", index=False)

    neighbors = []
    for i in tqdm(range(len(vocab))):
        sim_scores = cos_sim[i]
        # Exclude self-match by setting it to -inf
        sim_scores[i] = -np.inf
        top_indices = np.argpartition(sim_scores, -top_k)[-top_k:]
        top_sorted = top_indices[np.argsort(-sim_scores[top_indices])]
        neighbor_words = [vocab[j] for j in top_sorted]
        neighbors.append([vocab[i]] + neighbor_words)

    df = pd.DataFrame(neighbors)
    df.to_csv(f"test_sbert/top_{top_k}_{filename}.csv", index=False, header=False)

if __name__ == "__main__":
    pass
    # Generate embeddings for the top 40,000 words with a word filter
    # word_filter = WordFilter(min_length=3,max_length=15)
    # generate_embeddings(40000, 100, word_filter=word_filter)
