ARG GITHUB_TOKEN
# Set base image (host OS) 
FROM python:3.9
EXPOSE 8080/tcp

# Set the working directory in the container
COPY requirements.txt .
RUN pip install -r requirements.txt --default-timeout=100
ADD . /python-flask
WORKDIR /python-flask 

CMD ["python", "./app.py"]
