import os
import pytest
from starlette.testclient import TestClient

# Ensure the API can find the model before importing the app
os.environ.setdefault("MODEL_PATH", "models/credit_model.pkl")

from src.api.server import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    # Context manager triggers FastAPI startup/shutdown (loads model)
    with TestClient(app) as c:
        yield c
