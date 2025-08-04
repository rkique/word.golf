from .auth import auth_bp
from .catalog import catalog_bp
from .main import main_bp
from .stats import stats_bp
from .race import race_bp

#To be registered in create_app
blueprints = [auth_bp, catalog_bp, main_bp, stats_bp, race_bp]