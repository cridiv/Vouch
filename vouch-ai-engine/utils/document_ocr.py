"""
Document OCR & Field Extraction using Reducto
Handles document type detection, OCR, and field extraction with spatial awareness
Reducto preserves document layout and separates images from surrounding text
"""

import logging
import re
import cv2
import numpy as np
from typing import Dict, Tuple, Optional, List, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Lazy load Reducto
_reducto_loaded = False
reducto_processor = None


def _load_reducto():
    """Lazy load Reducto document processor on first use"""
    global _reducto_loaded, reducto_processor
    if not _reducto_loaded:
        try:
            import reducto
            reducto_processor = reducto.DocumentProcessor()
            _reducto_loaded = True
            logger.info("Reducto document processor loaded successfully")
        except ImportError:
            logger.warning("Reducto not installed - falling back to pytesseract OCR")
            _reducto_loaded = True
        except Exception as e:
            logger.error(f"Error loading Reducto: {e}")
            _reducto_loaded = True


# Regex patterns for document field extraction (fallback)
EXPIRY_PATTERNS = [
    r'(?:EXP|EXPIR[ES]*|VALID|UNTIL|EXPIRES?)\s*(?::|/|-|\.|\s)\s*(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})',
    r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})',  # Date patterns
    r'(?:20|21)\d{2}[-/]\d{2}[-/]\d{2}',  # ISO date format
]

NAME_PATTERNS = [
    r"(?:NAME|SURNAME|FULL NAME|GIVEN NAME|FAMILY NAME)[\s:]*([A-Z][A-Z\s]{2,})",
    r"^([A-Z][A-Z\s]{5,})$",  # Multi-line extraction for name blocks
]

DOCUMENT_TYPE_KEYWORDS = {
    "drivers_license": ["DRIVER", "LICENSE", "DRIVING", "CLASS", "RESTRICTED"],
    "passport": ["PASSPORT", "PASSPORT NO", "TRAVEL DOCUMENT", "P<"],
    "national_id": ["NATIONAL", "ID", "IDENTIFICATION", "CITIZEN"],
    "state_id": ["STATE", "ID", "IDENTIFICATION"],
}


def detect_document_type(image: np.ndarray) -> str:
    """
    Detect document type using Reducto's layout analysis
    Falls back to visual analysis if Reducto unavailable
    
    Args:
        image: CV2 image array
        
    Returns:
        Document type: drivers_license, passport, national_id, state_id, or unknown
    """
    try:
        _load_reducto()
        
        # Try Reducto first (if available)
        if reducto_processor is not None:
            try:
                result = reducto_processor.process_document(
                    image,
                    model_name="layout",
                    structured_output=True
                )
                
                # Extract text from Reducto result
                text = _extract_text_from_reducto(result)
                text_upper = text.upper()
                
                # Check text keywords for document type confirmation
                for doc_class, keywords in DOCUMENT_TYPE_KEYWORDS.items():
                    if any(keyword in text_upper for keyword in keywords):
                        logger.info(f"Document detected as {doc_class} via Reducto layout analysis")
                        return doc_class
            except Exception as e:
                logger.debug(f"Reducto detection failed: {e}, falling back to visual analysis")
        
        # Fallback: visual analysis
        height, width = image.shape[:2]
        aspect_ratio = width / height
        
        # Passport: usually more square (1:1.3 ratio)
        if 1.2 <= aspect_ratio <= 1.4:
            doc_type = "passport"
            logger.info(f"Document detected as passport (aspect ratio: {aspect_ratio:.2f})")
        # Driver's license: wider rectangle (1.7-2.0 ratio)
        elif 1.6 <= aspect_ratio <= 2.1:
            doc_type = "drivers_license"
            logger.info(f"Document detected as drivers_license (aspect ratio: {aspect_ratio:.2f})")
        # National ID: square-ish (0.8-1.2)
        elif 0.7 <= aspect_ratio <= 1.3:
            doc_type = "national_id"
            logger.info(f"Document detected as national_id (aspect ratio: {aspect_ratio:.2f})")
        else:
            doc_type = "unknown"
            logger.warning(f"Document type unclear (aspect ratio: {aspect_ratio:.2f})")
        
        return doc_type
        
    except Exception as e:
        logger.error(f"Error detecting document type: {e}")
        return "unknown"


def _extract_text_from_reducto(result: Dict[str, Any]) -> str:
    """
    Extract text from Reducto result, respecting spatial layout
    
    Args:
        result: Reducto processor result dict
        
    Returns:
        Combined text from all text elements
    """
    try:
        text_parts = []
        
        # Reducto returns structured elements with spatial information
        if isinstance(result, dict):
            # Extract from text blocks (preserving layout order)
            if "text" in result:
                text_parts.append(result["text"])
            
            # Extract from structured elements
            if "elements" in result and isinstance(result["elements"], list):
                for element in result["elements"]:
                    if element.get("type") == "text" and "text" in element:
                        text_parts.append(element["text"])
        
        return "\n".join(text_parts)
    except Exception as e:
        logger.debug(f"Error extracting text from Reducto result: {e}")
        return ""


def extract_document_fields(image: np.ndarray, doc_type: str) -> Dict[str, Optional[str]]:
    """
    Extract document fields using Reducto with spatial awareness
    Reducto preserves layout and separates images from text
    
    Args:
        image: CV2 image array
        doc_type: Document type (drivers_license, passport, national_id, etc.)
        
    Returns:
        Dict with fields: name, expiry_date, issue_date, document_number
    """
    fields = {
        "name": None,
        "expiry_date": None,
        "issue_date": None,
        "document_number": None,
        "face_region_detected": False,
        "face_region": None,
    }
    
    try:
        _load_reducto()
        
        # Try Reducto first (if available)
        if reducto_processor is not None:
            try:
                result = reducto_processor.process_document(
                    image,
                    model_name="layout",
                    structured_output=True
                )
                
                # Extract fields using Reducto's structured output
                fields = _extract_fields_from_reducto(result, doc_type)
                
                # Detect face region using spatial information from Reducto
                face_region = _extract_face_region_with_spatial_awareness(result, image)
                if face_region is not None:
                    fields["face_region_detected"] = True
                    fields["face_region"] = face_region
                
                logger.info(f"Extracted fields via Reducto: {fields}")
                return fields
                
            except Exception as e:
                logger.warning(f"Reducto extraction failed: {e}, falling back to pytesseract")
        
        # Fallback: use pytesseract
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        try:
            import pytesseract
            
            # Pre-process: increase contrast for better OCR
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # Extract text
            extracted_text = pytesseract.image_to_string(enhanced)
            logger.info(f"Extracted text ({doc_type}) via pytesseract: {extracted_text[:200]}...")
            
            # Extract fields
            fields["name"] = _extract_name(extracted_text)
            fields["expiry_date"] = _extract_expiry_date(extracted_text)
            fields["issue_date"] = _extract_issue_date(extracted_text)
            fields["document_number"] = _extract_document_number(extracted_text, doc_type)
            
        except Exception as e:
            logger.warning(f"pytesseract error: {e}, using fallback pattern matching")
            fields.update(_extract_fields_fallback(image))
        
        return fields
        
    except Exception as e:
        logger.error(f"Unexpected error in extract_document_fields: {e}")
        return fields


def _extract_fields_from_reducto(result: Dict[str, Any], doc_type: str) -> Dict[str, Optional[str]]:
    """
    Extract structured fields from Reducto result
    Reducto provides spatial coordinates and element types
    
    Args:
        result: Reducto processor result with spatial information
        doc_type: Document type for field extraction strategy
        
    Returns:
        Dict with extracted fields
    """
    fields = {
        "name": None,
        "expiry_date": None,
        "issue_date": None,
        "document_number": None,
        "face_region_detected": False,
    }
    
    try:
        # Combine all text from Reducto result
        full_text = _extract_text_from_reducto(result)
        
        # Use regex patterns for field extraction
        fields["name"] = _extract_name(full_text)
        fields["expiry_date"] = _extract_expiry_date(full_text)
        fields["issue_date"] = _extract_issue_date(full_text)
        fields["document_number"] = _extract_document_number(full_text, doc_type)
        
        # Check for image elements (face photo, usually at top or side)
        if "elements" in result and isinstance(result["elements"], list):
            for element in result["elements"]:
                if element.get("type") in ["image", "photo", "picture"]:
                    fields["face_region_detected"] = True
                    break
        
        return fields
    
    except Exception as e:
        logger.debug(f"Error extracting fields from Reducto: {e}")
        return fields


def _extract_face_region_with_spatial_awareness(result: Dict[str, Any], image: np.ndarray) -> Optional[np.ndarray]:
    """
    Extract face region from document using Reducto's spatial information
    Separates the face image from surrounding text and other elements
    
    Args:
        result: Reducto processor result with bounding boxes and element types
        image: Original image array
        
    Returns:
        Face region as numpy array or None if not found
    """
    try:
        if "elements" not in result or not isinstance(result["elements"], list):
            return None
        
        height, width = image.shape[:2]
        
        # Look for image/photo elements with spatial coordinates
        for element in result["elements"]:
            # Reducto marks photos/images separately from text
            if element.get("type") in ["image", "photo", "picture"]:
                # Get bounding box if available
                bbox = element.get("bbox")
                if bbox and isinstance(bbox, dict):
                    # bbox format: {"x0": float, "top": float, "x1": float, "bottom": float}
                    # or {"left": float, "top": float, "right": float, "bottom": float}
                    x0 = int(bbox.get("x0") or bbox.get("left", 0) * width)
                    top = int(bbox.get("top", 0) * height)
                    x1 = int(bbox.get("x1") or bbox.get("right", 1) * width)
                    bottom = int(bbox.get("bottom", 1) * height)
                    
                    # Clamp to image boundaries
                    x0 = max(0, min(x0, width))
                    x1 = max(0, min(x1, width))
                    top = max(0, min(top, height))
                    bottom = max(0, min(bottom, height))
                    
                    if x0 < x1 and top < bottom:
                        face_region = image[top:bottom, x0:x1]
                        logger.info(f"Extracted face region using Reducto spatial info: bbox=({x0},{top})-({x1},{bottom})")
                        return face_region
        
        return None
    
    except Exception as e:
        logger.debug(f"Error extracting face region with spatial awareness: {e}")
        return None


def _extract_name(text: str) -> Optional[str]:
    """Extract name from OCR text"""
    try:
        # Remove newlines and normalize spacing
        text = text.replace('\n', ' ').replace('\r', ' ')
        text_upper = text.upper()
        
        # Look for NAME: pattern
        for pattern in NAME_PATTERNS:
            matches = re.finditer(pattern, text_upper, re.MULTILINE)
            for match in matches:
                name = match.group(1) if match.groups() else match.group(0)
                name = name.strip()
                if len(name) > 3:  # Filter out noise
                    logger.info(f"Extracted name: {name}")
                    return name
        
        # Fallback: first line with multiple words (likely name)
        lines = text.split('\n')
        for line in lines:
            words = line.split()
            # Name likely has multiple capital words
            if len(words) >= 2 and all(w[0].isupper() for w in words if w):
                name = ' '.join(words)[:50]  # Cap at 50 chars
                if len(name) > 3:
                    logger.info(f"Extracted name (fallback): {name}")
                    return name
    
    except Exception as e:
        logger.debug(f"Error extracting name: {e}")
    
    return None


def _extract_expiry_date(text: str) -> Optional[str]:
    """Extract expiry date from OCR text"""
    try:
        text_upper = text.upper()
        
        for pattern in EXPIRY_PATTERNS:
            matches = re.finditer(pattern, text_upper)
            for match in matches:
                groups = match.groups()
                if groups and len(groups) >= 2:
                    try:
                        # Handle different date formats
                        month, day, year = groups[0], groups[1], groups[2]
                        year = int(year)
                        
                        # Convert 2-digit year to 4-digit
                        if year < 100:
                            year = 2000 + year if year < 50 else 1900 + year
                        
                        # Validate date
                        expiry = datetime(year, int(month), int(day))
                        date_str = expiry.strftime('%Y-%m-%d')
                        logger.info(f"Extracted expiry date: {date_str}")
                        return date_str
                    except (ValueError, TypeError):
                        continue
    
    except Exception as e:
        logger.debug(f"Error extracting expiry date: {e}")
    
    return None


def _extract_issue_date(text: str) -> Optional[str]:
    """Extract issue date from OCR text"""
    try:
        text_upper = text.upper()
        
        # Look for ISSUE, ISSUED, EFFECTIVE patterns
        issue_patterns = [
            r'(?:ISSUED|ISSUE|EFFECTIVE|ISSUED ON)\s*(?::|/|-|\.|\s)\s*(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})',
        ]
        
        for pattern in issue_patterns:
            matches = re.finditer(pattern, text_upper)
            for match in matches:
                try:
                    month, day, year = match.groups()
                    year = int(year)
                    if year < 100:
                        year = 2000 + year if year < 50 else 1900 + year
                    
                    issue = datetime(year, int(month), int(day))
                    date_str = issue.strftime('%Y-%m-%d')
                    logger.info(f"Extracted issue date: {date_str}")
                    return date_str
                except (ValueError, TypeError):
                    continue
    
    except Exception as e:
        logger.debug(f"Error extracting issue date: {e}")
    
    return None


def _extract_document_number(text: str, doc_type: str) -> Optional[str]:
    """Extract document number (license number, passport number, etc.)"""
    try:
        text_upper = text.upper()
        
        patterns = [
            r'(?:NUMBER|NO\.?|LICENSE NO|DRIVER LICENSE|PASSPORT NO|ID NO)\s*(?::|/|-|\.|\s)\s*([A-Z0-9]{5,20})',
            r'[A-Z0-9]{6,20}(?:\s|$)',  # Generic alphanumeric pattern
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text_upper)
            for match in matches:
                number = match.group(1) if match.groups() else match.group(0)
                number = number.strip()
                if len(number) >= 5 and len(number) <= 20:
                    logger.info(f"Extracted document number: {number}")
                    return number
    
    except Exception as e:
        logger.debug(f"Error extracting document number: {e}")
    
    return None


def _extract_fields_fallback(image: np.ndarray) -> Dict[str, Optional[str]]:
    """
    Fallback field extraction using spatial region detection
    When Reducto and pytesseract are not available
    
    Separates image regions (likely face) from text regions using spatial analysis
    """
    fields = {
        "name": None,
        "expiry_date": None,
        "issue_date": None,
        "document_number": None,
        "face_region_detected": False,
    }
    
    try:
        height, width = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect image/text regions using edge detection
        edges = cv2.Canny(gray, 50, 150)
        
        # Top region (typically contains photo/face) - usually high edge density
        top_region_height = int(height * 0.4)
        top_region = edges[0:top_region_height, :]
        top_edge_density = np.count_nonzero(top_region) / (top_region_height * width)
        
        # Bottom region (typically contains text/numbers)
        bottom_region = edges[int(height * 0.6):height, :]
        bottom_region_height = height - int(height * 0.6)
        bottom_edge_density = np.count_nonzero(bottom_region) / (bottom_region_height * width)
        
        # If top has higher edge density, likely contains face image
        if top_edge_density > 0.05:
            fields["face_region_detected"] = True
            logger.info(f"Face region detected via spatial analysis (edge density: {top_edge_density:.3f})")
        
        # Simple text extraction from middle/bottom regions
        # (Would need actual OCR for production)
        logger.debug("Using fallback spatial region analysis (OCR not available)")
        
    except Exception as e:
        logger.debug(f"Fallback extraction error: {e}")
    
    return fields


def validate_document_expiry(expiry_date_str: Optional[str]) -> Tuple[bool, str]:
    """
    Validate if document is not expired
    
    Args:
        expiry_date_str: Expiry date in YYYY-MM-DD format or None
        
    Returns:
        Tuple of (is_valid, status_message)
    """
    if not expiry_date_str:
        return True, "expiry_date_not_found"  # Allow to proceed if not found
    
    try:
        expiry = datetime.strptime(expiry_date_str, '%Y-%m-%d')
        today = datetime.now()
        
        if expiry < today:
            logger.warning(f"Document expired on {expiry_date_str}")
            return False, "document_expired"
        
        logger.info(f"Document valid until {expiry_date_str}")
        return True, "document_valid"
        
    except Exception as e:
        logger.debug(f"Error validating expiry date: {e}")
        return True, "expiry_date_invalid_format"
