# Learning NLP Deployment: Briefly AI 📝

This is a simple learning project designed to test and understand how to deploy a full-stack Natural Language Processing (NLP) application. The primary goal of this repository is to demonstrate:
1. **Containerized Backend Deployment**: Running a FastAPI NLP engine inside a Docker container on a **Hugging Face Space**.
2. **Decoupled Frontend Deployment**: Deploying a static React application separately (e.g. to Vercel or Netlify) that communicates with the Hugging Face Space API.

---

## Project Purpose & Architecture 🏗️

The project is structured into two independent parts to test separate hosting setups:

```text
               ┌────────────────────────┐
               │  Static Frontend       │
               │  (Vercel / Netlify)    │
               └───────────┬────────────┘
                           │
                 HTTPS POST│ (Fetch /api/summarize)
                           ▼
               ┌────────────────────────┐
               │  FastAPI Backend App   │
               │  (Hugging Face Space)  │
               └───────────┬────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
Summarization        Tone Analysis            NER & Keywords
(DistilBART)         (ModernBERT)             (DistilBERT)
```

### 1. Frontend (`/frontend`)
- A simple, clean React application built with Vite.
- Allows users to paste text, choose minimum/maximum summary lengths, and request a standard or detailed analysis.
- Serves as the consumer of the backend API endpoints.

### 2. Backend (`/backend`)
- A FastAPI application that serves Hugging Face NLP model pipelines.
- Implements:
  - **Summarization**: `sshleifer/distilbart-cnn-6-6`
  - **Tone Analysis**: Zero-shot classification using `tasksource/ModernBERT-base-nli`.
  - **Named Entity Recognition (NER)**: `elastic/distilbert-base-uncased-finetuned-conll03-english`
  - **Keyphrase Extraction**: `ml6team/keyphrase-extraction-distilbert-inspec`
- Configured with a `Dockerfile` for easy container deployment.

---

## Directory Structure 📁

```text
├── backend/
│   ├── main.py             # FastAPI Server & NLP inference logic
│   ├── Dockerfile          # Docker configuration for HF Spaces
│   ├── requirements.txt    # Pinned Python package dependencies
│   └── README.md           # API endpoints & Hugging Face metadata
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # React UI code & API integration
│   │   ├── index.css       # Layout styles
│   │   └── main.jsx
│   ├── package.json        # Frontend scripts and dependencies
│   └── vite.config.js      # Vite build configurations
└── README.md               # Main testing guide (this file)
```

---

## Testing Locally 🚀

### 1. Running the FastAPI Backend
1. Go to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server locally:
   ```bash
   python main.py
   ```
   *The server runs at `http://localhost:8000`. You can inspect the API interactive docs at `http://localhost:8000/docs`.*

### 2. Running the React Frontend
1. In a new terminal window, navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:5173` to interact with the frontend locally. Note that it will connect to your deployed backend or localhost based on the `BASE_URL` defined in `App.jsx`.*

---

## Deployment Walkthrough 🌐

This project was built to test and verify the following production deployment workflow:

### Step 1: Deploy the Backend to Hugging Face Spaces
1. Create a new Space on [Hugging Face](https://huggingface.co/new-space).
2. Choose **Docker** as the SDK (rather than Streamlit or Gradio).
3. The Space will automatically detect the [Dockerfile](./backend/Dockerfile) in your backend and build the server.
4. Your direct API endpoint will be: `https://<your-username>-<your-space-name>.hf.space`

### Step 2: Deploy the Frontend to Vercel / Netlify
1. Connect your GitHub repository to a static hosting platform like [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/).
2. Point the build settings to the `frontend` directory.
3. Configure the `BASE_URL` in your frontend code (or as an environment variable) to point to your live Hugging Face Space API URL.

---

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
