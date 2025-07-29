from application import create_app
from waitress import serve
app = create_app()
import os

# Disable caching for static files (after updating data model)
# app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

if __name__ == "__main__":
    if os.getenv("DEV", "false").lower() == "true":
        port = int(os.getenv("PORT", 8080))
        app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)
    else:
        port = int(os.getenv("PORT", 8000))
        serve(app, host="0.0.0.0", port=port)
