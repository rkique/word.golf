from application import create_app
from waitress import serve
app = create_app()

if __name__ == "__main__": 
    # serve(app, host="0.0.0.0", port=5000)
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=True)