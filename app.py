from application import create_app
from waitress import serve
app = create_app()

# Disable caching for static files (after updating data model)
# app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
#commettd
if __name__ == "__main__": 
    serve(app, host="0.0.0.0", port=5050)
    # app.run(host='localhost', port=5050, debug=True, use_reloader=False)
