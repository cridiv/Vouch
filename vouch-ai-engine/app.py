
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import routers
from endpoints.identity_verify import router as identity_router
from endpoints.fraud_assess import router as fraud_router
from utils.model_cache import ModelCache

# Initialize FastAPI app
app = FastAPI(
    title="TrustLayer ML Service",
    description="Identity Verification & Fraud Detection API",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(identity_router)
app.include_router(fraud_router)


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    Returns service status and version info
    """
    return JSONResponse(
        status_code=200,
        content={
            "status": "OK",
            "service": "TrustLayer ML Service",
            "version": "0.1.0",
            "endpoints": {
                "identity_verify": "/identity/verify",
                "fraud_assess": "/fraud/assess",
                "health": "/health"
            }
        }
    )


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("=" * 60)
    logger.info("ML Service starting up...")
    logger.info("=" * 60)
    
    # Log environment
    port = os.getenv("ML_PORT", "8080")
    logger.info(f"📡 ML Service port: {port}")
    
    # Pre-load ML models for optimal performance
    logger.info("Pre-loading ML models...")
    try:
        ModelCache.initialize_models()
        logger.info("All ML models pre-loaded successfully")
    except Exception as e:
        logger.warning(f"Model pre-loading partial: {e}")
    
    # Log endpoints
    logger.info("✓ FastAPI server initialized")
    logger.info("✓ CORS enabled for all origins")
    logger.info("✓ Ready to accept requests on:")
    logger.info("  • POST  /identity/verify    - Document & selfie verification")
    logger.info("  • POST  /fraud/assess       - Transaction fraud assessment")
    logger.info("  • GET   /health             - Service health check")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("=" * 60)
    logger.info("ML Service shutting down...")
    logger.info("=" * 60)
