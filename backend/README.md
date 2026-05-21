---
title: Briefly AI API
emoji: 📝
colorFrom: pink
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Briefly AI API 🚀

An advanced, high-performance NLP service built with **FastAPI** and **Hugging Face Transformers**. This backend acts as the core intelligence engine for the Briefly AI frontend, delivering text summarization, named entity recognition (NER), zero-shot tone classification (powered by **ModernBERT**), and keyphrase extraction.

## Features ✨

- **Text Summarization**: Distills complex paragraphs into clear, concise summaries using `sshleifer/distilbart-cnn-6-6`.
- **Zero-Shot Tone Classification**: Classifies text into 10 nuanced, contextual tones (e.g. academic, promotional, narrative, conversational, professional) using the state-of-the-art `tasksource/ModernBERT-base-nli`.
- **Named Entity Recognition (NER)**: Detects and groups real-world locations, organizations, and persons using `elastic/distilbert-base-uncased-finetuned-conll03-english`.
- **Keyphrase Extraction**: Extracts key conceptual keywords from the text using `ml6team/keyphrase-extraction-distilbert-inspec`.
- **Lifespan Initialization**: Models are pre-warmed and loaded on start-up for fast subsequent inference.

---

## API Endpoints 🛣️

### 1. Health Check
* **Endpoint**: `GET /api/health`
* **Purpose**: Verifies that backend pipelines are fully initialized.
* **Response**:
```json
{
  "status": "healthy",
  "model": "sshleifer/distilbart-cnn-6-6"
}
```

### 2. Basic Summarize
* **Endpoint**: `POST /api/summarize`
* **Payload**:
```json
{
  "text": "Your long text here...",
  "min_length": 30,
  "max_length": 130
}
```
* **Response**:
```json
{
  "summary": "The distilled summary text.",
  "original_length_chars": 1240,
  "original_length_words": 210,
  "summary_length_chars": 340,
  "summary_length_words": 55,
  "percentage_reduction": 72.58,
  "time_taken_seconds": 1.45,
  "summarization_model_used": "sshleifer/distilbart-cnn-6-6"
}
```

### 3. Detailed Analysis
* **Endpoint**: `POST /api/summarize-detailed`
* **Payload**: Same as `/api/summarize`
* **Response**:
```json
{
  "summary": "The distilled summary text.",
  "original_length_chars": 1240,
  "original_length_words": 210,
  "summary_length_chars": 340,
  "summary_length_words": 55,
  "percentage_reduction": 72.58,
  "time_taken_seconds": 2.12,
  "summarization_model_used": "sshleifer/distilbart-cnn-6-6",
  "entities_found": ["Hugging Face", "FastAPI", "London"],
  "tone": "informational / instructional",
  "keywords": ["transformer", "pipeline", "classification"],
  "ner_model_used": "elastic/distilbert-base-uncased-finetuned-conll03-english",
  "tone_model_used": "tasksource/ModernBERT-base-nli",
  "keywords_model_used": "ml6team/keyphrase-extraction-distilbert-inspec"
}
```

---

## Run Locally 💻

### Prerequisites
- Python 3.10+
- PyTorch (CPU or GPU supported)

### Setup & Run
1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   python main.py
   ```
   *The server will start on `http://127.0.0.1:8000` with Swagger docs available at `http://127.0.0.1:8000/docs`.*

---

## Run with Docker 🐳

You can also package and run this application inside a lightweight container:

```bash
# Build the Docker image
docker build -t briefly-ai-api .

# Run the container locally (mapps port 8000 to internal port 7860)
docker run -p 8000:7860 briefly-ai-api
```

---

## Deployment to Hugging Face Spaces 🌟

This directory is ready for zero-config deployment to a Hugging Face Space running in **Docker** mode:
1. Ensure the Space SDK type is set to **Docker** in your Hugging Face Space settings.
2. The `app_port` is configured in the front matter to `7860`.
3. The Space will automatically build using the included [Dockerfile](./Dockerfile) and start serving the FastAPI application.
