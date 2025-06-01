# Set base image (host OS) 
FROM python:3.9
EXPOSE 5000/tcp
    
# Install dependencies
RUN apt-get update && apt-get install -y git git-lfs curl

# Clone the repo and pull LFS files
RUN git lfs install && \
    git clone https://github.com/rkique/word.golf.git /golf-app && \
    cd /golf-app && git lfs pull

WORKDIR /golf-app

RUN pip install -r requirements.txt --default-timeout=100

CMD ["python", "./app.py"]
