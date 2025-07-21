FROM python:3.9
EXPOSE 5050

RUN apt-get update && apt-get install -y git git-lfs curl
RUN git lfs install

# Add requirements file early to leverage cache
COPY requirements.txt /tmp/

# Preinstall Python dependencies
RUN pip install -r /tmp/requirements.txt --default-timeout=100

# Set build-time ARG
ARG GITHUB_TOKEN

# Clone the repo with Git LFS (last step to avoid cache busting early)
RUN test -n "$GITHUB_TOKEN" || (echo "GITHUB_TOKEN not set!" && exit 1) && \
    git clone --branch linear-tallies https://${GITHUB_TOKEN}@github.com/rkique/word.golf.git /golf-app && \
    cd /golf-app && git lfs pull

# Set working directory
WORKDIR /golf-app

# Command to run the app
CMD ["python", "./app.py"]