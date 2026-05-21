import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import pipeline
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("summarizer-backend")

# Global pipeline reference
text_summarizer = None
text_ner = None
text_emotion = None
text_keywords = None

SUMMARIZATION_MODEL_NAME = "sshleifer/distilbart-cnn-6-6"
NER_MODEL_NAME = "elastic/distilbert-base-uncased-finetuned-conll03-english"
EMOTION_MODEL_NAME = "bhadresh-savani/distilbert-base-uncased-emotion"
KEYWORDS_MODEL_NAME = "ml6team/keyphrase-extraction-distilbert-inspec"

@asynccontextmanager
async def lifespan(app: FastAPI):
    global text_summarizer, text_ner, text_emotion, text_keywords
    logger.info("Initializing NLP models...")
    start_time = time.time()
    try:
        text_summarizer = pipeline("summarization", model=SUMMARIZATION_MODEL_NAME, framework="pt")
        text_ner = pipeline("ner", model=NER_MODEL_NAME, framework="pt", aggregation_strategy="simple")
        text_emotion = pipeline("text-classification", model=EMOTION_MODEL_NAME, framework="pt")
        text_keywords = pipeline("token-classification", model=KEYWORDS_MODEL_NAME, framework="pt", aggregation_strategy="simple")
        
        duration = time.time() - start_time
        logger.info(f"All models loaded successfully in {duration:.2f} seconds.")
    except Exception as e:
        logger.error(f"Failed to load pipelines: {str(e)}")
        raise e
    yield
    logger.info("Cleaning up backend lifespan resources...")

app = FastAPI(
    title="Enhanced Text Analysis API",
    description="FastAPI text engine featuring Summarization, NER, Emotion Analysis, and Keyphrase Extraction.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST / RESPONSE SCHEMAS ---

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=10, description="The text to be processed.")
    min_length: int = Field(30, ge=5, le=300, description="Minimum length of the summary.")
    max_length: int = Field(130, ge=10, le=500, description="Maximum length of the summary.")


class SummarizeResponse(BaseModel):
    summary: str
    original_length_chars: int
    original_length_words: int
    summary_length_chars: int
    summary_length_words: int
    percentage_reduction: float
    time_taken_seconds: float
    summarization_model_used: str

class SummarizeResponseDetailed(SummarizeResponse):
    entities_found: List[str]
    emotion: str
    keywords: List[str]
    ner_model_used: str
    emotion_model_used: str
    keywords_model_used: str

# --- HELPER PARSING FUNCTIONS ---

def extract_entities(text: str) -> List[str]:
    """Extracts unique entity names from the NER pipeline."""
    try:
        raw_entities = text_ner(text)
        return list(set([ent['word'].strip() for ent in raw_entities if len(ent['word']) > 1]))
    except Exception as e:
        logger.warning(f"NER extraction failed: {str(e)}")
        return []

def analyze_emotion(text: str) -> str:
    """Extracts dominant emotion label."""
    try:
        raw_emotions = text_emotion(text)
        return raw_emotions[0]['label'] if raw_emotions else "unknown"
    except Exception as e:
        logger.warning(f"Emotion analysis failed: {str(e)}")
        return "unknown"

def extract_keywords(text: str) -> List[str]:
    """Extracts and cleans up keyphrases, removing sub-word token hashtags."""
    try:
        raw_keywords = text_keywords(text)
        cleaned_phrases = set()
        for item in raw_keywords:
            phrase = item['word'].replace("##", "").strip()
            if len(phrase) > 2:
                cleaned_phrases.add(phrase)
        return list(cleaned_phrases)
    except Exception as e:
        logger.warning(f"Keyword extraction failed: {str(e)}")
        return []

# --- ENDPOINTS ---

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy" if text_summarizer is not None else "loading/unhealthy",
        "model": SUMMARIZATION_MODEL_NAME
    }

@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_text(request: SummarizeRequest):
    global text_summarizer
    if text_summarizer is None:
        raise HTTPException(status_code=503, detail="Model pipeline is currently unavailable.")
    
    if request.max_length <= request.min_length:
        raise HTTPException(status_code=400, detail="max_length must be strictly greater than min_length.")

    words_in_input = len(request.text.split())
    if words_in_input < 10:
        raise HTTPException(status_code=400, detail="Input text is too short. Please provide at least 10 words.")

    try:
        tokens_count = len(text_summarizer.tokenizer.encode(request.text))
        if tokens_count > 1024:
            raise HTTPException(
                status_code=400,
                detail=f"Input text is too long ({tokens_count} tokens). Please shorten text to under 1024 tokens."
            )
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        logger.warning(f"Failed to count tokens: {str(e)}")

    start_time = time.time()
    try:
        adjusted_max_length = min(request.max_length, words_in_input)
        adjusted_min_length = min(request.min_length, max(5, adjusted_max_length - 5))

        result = text_summarizer(
            request.text, 
            min_length=adjusted_min_length, 
            max_length=adjusted_max_length, 
            do_sample=False
        )
        
        summary_text = result[0]["summary_text"]
        duration = time.time() - start_time
        
        words_in_summary = len(summary_text.split())
        chars_original = len(request.text)
        chars_summary = len(summary_text)
        reduction = 100.0 * (1.0 - (chars_summary / chars_original)) if chars_original > 0 else 0.0
        
        return SummarizeResponse(
            summary=summary_text,
            original_length_chars=chars_original,
            original_length_words=words_in_input,
            summary_length_chars=chars_summary,
            summary_length_words=words_in_summary,
            percentage_reduction=round(reduction, 2),
            time_taken_seconds=round(duration, 2),
            summarization_model_used=SUMMARIZATION_MODEL_NAME
        )
    except Exception as e:
        logger.error(f"Inference error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

@app.post("/api/summarize-detailed", response_model=SummarizeResponseDetailed)
async def summarize_text_detailed(request: SummarizeRequest):

    base_result = await summarize_text(request)
    
    extracted_entities = extract_entities(request.text)
    emotion = analyze_emotion(request.text)
    extracted_keywords = extract_keywords(request.text)
    
    return SummarizeResponseDetailed(
        **base_result.model_dump(),
        entities_found=extracted_entities,
        emotion=emotion,
        keywords=extracted_keywords,
        ner_model_used=NER_MODEL_NAME,
        emotion_model_used=EMOTION_MODEL_NAME,
        keywords_model_used=KEYWORDS_MODEL_NAME
    )

if __name__ == "__main__":
    import uvicorn
    # Assumes filename is main.py
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
