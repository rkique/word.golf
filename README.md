# word.golf: a sport played with the meanings of words

Word golf is built on a modified set of [word2vec](http://jalammar.github.io/illustrated-word2vec/) embeddings, efficiently stored as a gensim KeyedVector. 

At the basic level, the frontend uses Jinja templating and the Tachyons CSS framework. HTML DOM manipulation is handled by Javascript functions provided in the static folder. The backend follows the Flask Application Factory, and uses Flask `Session` to persist across client reloads. 

The revised version uses `XMLHttpRequest()`. By sending and receiving JSON instead of entire templates, the app dynamically renders screens without having to reload the page. It also improves the app's load time.

The raw 100 closest neighbors for each word are stored in a text file; at each render, get_curve uses the KeyedVector instance to bias neighbors towards the target vector.

### What is word golf?
Word golf (word.golf) is a language sport played by moving between static embeddings of words. Given a start word and a grid of its neighbors, your goal is to reach a target word in as few jumps as possible. Every prompt given can be completed in two jumps!

Neighbors are determined by cosine similarity to the target vector, biased towards the start vector. This makes jumping feel more intuitive and ensures that players do not get too far off track.

<img width="1414" alt="Screenshot 2023-06-15 at 10 11 44 AM" src="https://github.com/rkique/word.golf-2/assets/46641307/c9d9081c-c41b-43db-bf5b-027c3dc9025e">



