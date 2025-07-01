from application import create_app
from waitress import serve
app = create_app()
import os

# Disable caching for static files (after updating data model)

if __name__ == "__main__":
    if os.getenv("DEV", "false").lower() == "true":
        app.run(host="127.0.0.1", port=8080, debug=True, use_reloader=False)
    else:
        serve(app, host="0.0.0.0", port=8000)
