from better_profanity import profanity
import spacy


class WordFilter:
    def __init__(self,
    min_length=3,
    max_length=15, 
    lang_model="en_core_web_trf"):

        self.min_length = min_length
        self.max_length = max_length
        profanity.load_censor_words()
        self.nlp = spacy.load(lang_model, disable=["parser"])
    
    def is_valid_length(self,word):
        return self.min_length <= len(word) <= self.max_length
    
    def is_clean(self, word):
        return not profanity.contains_profanity(word)

    def filter(self, list_of_words):
        result = []
        doc = self.nlp(" ".join(list_of_words))
        for token in doc:
            lemma = token.lemma_.lower()
            #print(f'{lemma.isalpha()} {self.is_valid_length(lemma)} {self.is_clean(lemma)}')
            if lemma.isalpha() and \
            self.is_valid_length(lemma) \
            and self.is_clean(lemma) \
            and token.ent_type_ == '':
                if lemma not in result:
                    result.append(lemma)
        return result
        
if __name__ == "__main__":
    word_filter = WordFilter(min_length=3,max_length=15)
    word_filter.filter(["hello","pinochet","james","world", ])
