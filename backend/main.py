import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from pydantic import BaseModel, Field
from transformers import pipeline
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("summarizer-backend")

# Global pipeline reference
text_summarizer = None
text_ner = None
text_tone = None
text_keywords = None

SUMMARIZATION_MODEL_NAME = "sshleifer/distilbart-cnn-6-6"
NER_MODEL_NAME = "elastic/distilbert-base-uncased-finetuned-conll03-english"
TONE_MODEL_NAME = "tasksource/ModernBERT-base-nli"
KEYWORDS_MODEL_NAME = "ml6team/keyphrase-extraction-distilbert-inspec"

candidate_tones = [
    "informational / instructional",  # 1. Facts, guides, or tutorials
    "talk / conversational",          # 2. Casual speech, texting, or chatting
    "promotional / marketing",        # 3. Sales pitches, ads, or persuasion
    "academic / scholarly",           # 4. Research, formal studies, or dense theory
    "narrative / storytelling",       # 5. Fiction, anecdotes, or describing events
    "opinion / editorial",            # 6. Personal viewpoints, commentary, or reviews
    "professional / corporate",       # 7. Business emails, updates, or reports
    "urgent / critical",              # 8. Alerts, warnings, or time-sensitive news
    "creative / poetic",              # 9. Expressive, artistic, or stylistic text
    "legal / administrative"          # 10. Terms of service, contracts, or official rules
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    global text_summarizer, text_ner, text_tone, text_keywords
    logger.info("Initializing NLP models...")
    start_time = time.time()
    try:
        text_summarizer = pipeline("summarization", model=SUMMARIZATION_MODEL_NAME, framework="pt")
        text_ner = pipeline("ner", model=NER_MODEL_NAME, framework="pt", aggregation_strategy="simple")
        text_tone = pipeline("zero-shot-classification", model=TONE_MODEL_NAME, framework="pt")
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
    description="FastAPI text engine featuring Summarization, NER, Tone Analysis, and Keyphrase Extraction.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="openapi.json",
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://fastly.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://fastly.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url="openapi.json",
        title=app.title + " - ReDoc",
        redoc_js_url="https://fastly.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js",
    )

# --- REQUEST / RESPONSE SCHEMAS ---

class TokenizeRequest(BaseModel):
    text: str = Field(..., description="The text to tokenize.")

class TokenInfo(BaseModel):
    id: int
    text: str
    color_index: int

class TokenizeResponse(BaseModel):
    tokens: List[TokenInfo]
    token_count: int

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
    tone: str
    keywords: List[str]
    ner_model_used: str
    tone_model_used: str
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

def analyze_tone(text: str) -> str:
    """Extracts dominant tone label."""
    try:
        raw_tones = text_tone(text, candidate_labels=candidate_tones)
        return raw_tones['labels'][0] if raw_tones and 'labels' in raw_tones else "unknown"
    except Exception as e:
        logger.warning(f"Tone analysis failed: {str(e)}")
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

@app.post("/api/tokenize", response_model=TokenizeResponse)
async def tokenize_text(request: TokenizeRequest):
    global text_summarizer
    if text_summarizer is None:
        raise HTTPException(status_code=503, detail="Model pipeline is currently unavailable.")
    
    try:
        if not request.text.strip():
            return TokenizeResponse(tokens=[], token_count=0)
            
        input_ids = text_summarizer.tokenizer.encode(request.text, add_special_tokens=False)
        
        tokens_list = []
        for idx, token_id in enumerate(input_ids):
            token_text = text_summarizer.tokenizer.decode([token_id])
            tokens_list.append(TokenInfo(
                id=token_id,
                text=token_text,
                color_index=idx % 5
            ))
            
        return TokenizeResponse(
            tokens=tokens_list,
            token_count=len(input_ids)
        )
    except Exception as e:
        logger.error(f"Tokenization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Tokenization failed: {str(e)}")

@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_text(request: SummarizeRequest):
    global text_summarizer
    if text_summarizer is None:
        raise HTTPException(status_code=503, detail="Model pipeline is currently unavailable.")
    
    if request.max_length <= request.min_length:
        raise HTTPException(status_code=400, detail="max_length must be strictly greater than min_length.")

    words_in_input = len(request.text.split())
    
    # Calculate token count first
    try:
        tokens_count = len(text_summarizer.tokenizer.encode(request.text))
    except Exception as e:
        logger.error(f"Failed to count tokens: {str(e)}")
        tokens_count = int(words_in_input * 1.3) # Fallback estimation

    if tokens_count < 10:
        raise HTTPException(status_code=400, detail="Input text is too short. Please provide at least 10 tokens.")

    if tokens_count > 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Input text is too long ({tokens_count} tokens). Please shorten text to under 1024 tokens."
        )

    start_time = time.time()
    try:
        # Clamp based on token count
        adjusted_max_length = min(request.max_length, tokens_count)
        adjusted_min_length = min(request.min_length, max(5, adjusted_max_length - 5))
        
        # Absolute safeguard for short inputs to prevent Hugging Face errors
        if adjusted_max_length <= adjusted_min_length:
            adjusted_min_length = max(1, adjusted_max_length - 1)

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
    tone = analyze_tone(request.text)
    extracted_keywords = extract_keywords(request.text)
    
    return SummarizeResponseDetailed(
        **base_result.model_dump(),
        entities_found=extracted_entities,
        tone=tone,
        keywords=extracted_keywords,
        ner_model_used=NER_MODEL_NAME,
        tone_model_used=TONE_MODEL_NAME,
        keywords_model_used=KEYWORDS_MODEL_NAME
    )

if __name__ == "__main__":
    import uvicorn
    # Assumes filename is main.py
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
