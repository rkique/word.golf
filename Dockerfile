ARG GITHUB_TOKEN
RUN test -n "$GITHUB_TOKEN" || (echo "GITHUB_TOKEN not set!" && exit 1)

FROM python:3.9
EXPOSE 5000

RUN apt-get update && apt-get install -y git git-lfs curl

RUN git lfs install && \
    git clone https://${GITHUB_TOKEN}@github.com/rkique/word.golf.git /golf-app && \
    cd /golf-app && git lfs pull

WORKDIR /golf-app

RUN pip install -r requirements.txt --default-timeout=100

CMD ["python", "./app.py"]
