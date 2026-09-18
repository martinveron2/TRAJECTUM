FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
COPY src ./src
RUN pip install --no-cache-dir . uvicorn
CMD ["uvicorn", "trajectum_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
