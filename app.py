from application import create_app
from waitress import serve
app = create_app()

# Disable waitress here if deployment not intended

if __name__ == "__main__": 
    # serve(app, host="0.0.0.0", port=5000)
    app.run(host='localhost', port=8080, debug=True, use_reloader=False)
