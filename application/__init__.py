from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail
from authlib.integrations.flask_client import OAuth
from flask_migrate import Migrate
import itsdangerous
import os
from dotenv import load_dotenv


load_dotenv()
db = SQLAlchemy()
mail = Mail()
oauth = OAuth()
migrate = Migrate()
cookie_signer = None  # Will be set in create_app

def create_app(): 
    app = Flask(__name__, instance_relative_config=False)
    app.config['SECRET_KEY'] = os.urandom(32) 

    app.config["SQLALCHEMY_DATABASE_URI"] = (os.environ.get("DATABASE_URL"))
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    app.config.update(
        MAIL_SERVER='smtp.gmail.com',
        MAIL_PORT=587,
        MAIL_USE_TLS=True,
        MAIL_USERNAME=os.environ.get('MAIL_USER'),
        MAIL_PASSWORD=os.environ.get('MAIL_PASSWORD'),
    )

    # Initialize extensions with app
    db.init_app(app)
    mail.init_app(app)
    oauth.init_app(app)
    migrate.init_app(app, db)

    global cookie_signer
    SECRET_KEY = os.environ.get("COOKIE_SECRET_KEY", "AEB75123B3B9738C82FC48B5BF6C3")
    cookie_signer = itsdangerous.URLSafeTimedSerializer(SECRET_KEY)

    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

    oauth.register(
        name='google',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        access_token_url='https://oauth2.googleapis.com/token',
        access_token_params=None,
        authorize_url='https://accounts.google.com/o/oauth2/auth',
        authorize_params=None,
        api_base_url='https://www.googleapis.com/oauth2/v2/',
        jwks_uri="https://www.googleapis.com/oauth2/v3/certs",
        client_kwargs={'scope': 'openid email profile'}
    )

    with app.app_context():
        from .internals import crypto
        from .internals import auth
        from .internals import passwordreset
        from .internals import gameprogress
        from .internals import statistics
        import logging
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.ERROR)

    from .routes import blueprints
    for blueprint in blueprints:
        app.register_blueprint(blueprint)

    return app