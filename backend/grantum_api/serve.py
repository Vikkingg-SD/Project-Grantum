from waitress import serve

from . import create_app

if __name__ == "__main__":
    serve(create_app(), host="127.0.0.1", port=5050, threads=4, expose_tracebacks=False)
