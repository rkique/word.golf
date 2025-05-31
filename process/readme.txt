The scripts in this folder end up producing three files which are relevant for the application: a comma-separated file of the top K neighbors for each word, a dataframe of word embeddings used to bias the neighbors shown at any moment, and a list of (start, target) pairs. 

We are currently using sbert_word_embeddings, a list of neighbors which appear more than 5000 times each in gbooks 2020, and the top 120 neighbors to select our words from.

The word embeddings are at the core of the application. They are being sourced from sbert sentence embeddings. 

In order to generate the file of the top K neighbors, we first find a source for the word embeddings and subsequently generate the top K neighbors through iteration (this could be improved if necessary with optimization techniques).

To generate the (start, target) pairs, we use Google Books 2020 word frequencies to find more frequent words. 