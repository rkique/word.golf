[6-11-2025] Please see the process repository to understand the generation process better. It now uses a vocabulary weighted towards contemporary usage with Google Books frequencies, and an exclude/include list to manually curate words. 

[5-19-2025] The current model uses Word2Vec, >2.3 threshold, 200 neighbor window.

The process for creating a precalculated file is as follows:
1. Select a source for word embeddings (e.g. Word2Vec)
2. Filter the source for choice words and for overall word similarity
3. Save the top N neighbors to a file (e.g. 200 neighbors)

The number of neighbors shown can then be adjusted in the util.py file.
