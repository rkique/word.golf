
from flask import Flask, request, make_response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import uuid
import os
from datetime import datetime, timedelta


load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True, origins="*")

user = os.getenv("DATABASE_USER")
password = os.getenv("DATABASE_PASSWORD")
host = os.getenv("DATABASE_HOST")
port = os.getenv("DATABASE_PORT")
dbname = os.getenv("DATABASE_NAME")

app.config["SQLALCHEMY_DATABASE_URI"] = (
    "mysql://doadmin:AVNS_TaSXRiUB7IvX0g5XzqA@db-mysql-nyc3-73469-do-user-14121328-0.i.db.ondigitalocean.com:25060/defaultdb?ssl_mode=REQUIRED"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    streak = db.Column(db.Integer, default=0)
    date_created = db.Column(db.Date, default=datetime.utcnow)
    last_date_accessed = db.Column(db.Date, default=datetime.utcnow)


@app.before_request
def create_tables():
    # db.drop_all()
    db.create_all()


@app.route("/", methods=["GET"])
def index():
    user_cookie = request.cookies.get("user_id")
    today = datetime.utcnow().date()

    user = None
    if user_cookie:
        user = User.query.get(user_cookie)

    if user:
        if user.last_date_accessed == today:
            
            pass
        elif user.last_date_accessed == today - timedelta(days=1):
            
            user.streak += 1
        else:
            
            user.streak = 1

        user.last_date_accessed = today
        db.session.commit()
        msg = f"Welcome back! Streak = {user.streak} days"
    else:
        
        new_id = str(uuid.uuid4())
        new_user = User(
            id=new_id,
            streak=1,
            date_created=today,
            last_date_accessed=today
        )
        db.session.add(new_user)
        db.session.commit()
        user_cookie = new_id
        msg = f"New user created! Streak = 1"

    resp = make_response({"message": msg})
    resp.set_cookie("user_id", user_cookie, max_age=60 * 60 * 24 * 365)
    return resp

if __name__ == "__main__":
    app.run(port=7000, debug=True)
