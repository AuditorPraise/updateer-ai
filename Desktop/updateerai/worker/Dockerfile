FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY webhook_server.py .

# Expose the port
EXPOSE 8000

CMD ["python", "webhook_server.py"]
