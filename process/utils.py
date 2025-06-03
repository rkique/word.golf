from better_profanity import profanity
import spacy
from tqdm import tqdm
import re


class WordFilter:
    def __init__(self,
    min_length=3,
    max_length=15, 
    lang_model="en_core_web_trf",
    exclude_file=None):
        self.min_length = min_length
        self.max_length = max_length
        profanity.load_censor_words()
        
        if exclude_file:
            with open(exclude_file, "r", encoding="utf-8") as f:
                self.exclusion = [line.strip() for line in f if line.strip()]

        self.nlp = spacy.load(lang_model, disable=["parser"])

    def is_alpha_en(self,word):
        return re.fullmatch(r"[a-zA-Z]+", word) is not None

    def is_valid_length(self,word):
        return self.min_length <= len(word) <= self.max_length
    
    def is_clean(self, word):
        return not profanity.contains_profanity(word)

    def filter(self, list_of_words):
        result = []
        doc = self.nlp(" ".join(list_of_words))
        for token in tqdm(doc, desc="Filtering words"):
            lemma = token.lemma_.lower()
            if self.is_alpha_en(lemma) and \
            self.is_valid_length(lemma) \
            and self.is_clean(lemma) \
            and token.ent_type_ == '':
                if lemma not in result:
                    result.append(lemma)
        return result
        
class NounFilter(WordFilter):
    def filter(self, list_of_words):
        result = []
        doc = self.nlp(" ".join(list_of_words))
        for token in doc:
            lemma = token.lemma_.lower()
            if self.is_alpha_en(lemma) \
            and self.is_valid_length(lemma) \
            and self.is_clean(lemma) \
            and token.ent_type_ == '' \
            and token.pos_ == "NOUN" or token.pos_ == "PROPN" :
                if lemma not in result:
                    result.append(lemma)
        return result

if __name__ == "__main__":
    word_filter = WordFilter(min_length=3,max_length=14)
    filtered = word_filter.filter(["hello","pinochet","james","world", "떠올랐다"])
    assert filtered == ['hello', 'james', 'world']
    noun_filter = NounFilter(min_length=3,max_length=14)
    words = ["timidity","prefer","combine","animosity","supervisor","renowned","lucky","revival","accompany","beginnings","deserving","agility","ungrateful","astonishment","origin","glide","sphere","pirate","scoundrel","crappy","ave","missus","bewildered","gloom","assassin","freshman","statue","trademark"]
    filtered = noun_filter.filter(words)
    assert filtered == ['timidity', 'combine', 'animosity', 'supervisor', 'revival', 'beginning', 'agility', 'astonishment', 'origin', 'glide', 'sphere', 'pirate', 'scoundrel', 'ave', 'missus', 'gloom', 'assassin', 'freshman', 'statue', 'trademark']
    print(filtered)