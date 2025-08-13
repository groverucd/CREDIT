FROM python:3.11-slim

# system deps
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# copy code + model
COPY . /app

# env defaults (override in cloud)
ENV MODEL_PATH=models/credit_model.pkl
ENV THRESH_APPROVE=0.33
ENV THRESH_REJECT=0.67
ENV PORT=8000

# expose for cloud runners
EXPOSE 8000

# run uvicorn; important: host 0.0.0.0 and PYTHONPATH=.
CMD ["bash","-lc","PYTHONPATH=. uvicorn src.api.server:app --host 0.0.0.0 --port ${PORT}"]
