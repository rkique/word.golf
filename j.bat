rem this is a quickstart script that opens localhost:5000 and the server
set FLASK_APP=app.py
set FLASK_DEBUG=1
start "" http://localhost:8080/
flask run --port=8080
cmd /k