from application import create_app, socketio
from waitress import serve
import os

app = create_app()

# Disable caching for static files (after updating data model)
# app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

if __name__ == "__main__":
    if os.getenv("DEV", "false").lower() == "true":
        port = int(os.getenv("PORT", 8080))
        socketio.run(app, host="0.0.0.0", port=port, debug=True, use_reloader=False)
    else:
        port = int(os.getenv("PORT", 8000))
        socketio.run(app, host="0.0.0.0", port=port)
    print('SocketIO server is running...')