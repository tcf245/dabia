from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import uuid
import re

from dabia.database import get_db
from dabia.api.deps import get_current_user
from dabia import models, schemas

router = APIRouter()

def infer_metadata(name: str):
    """Fallback logic to infer difficulty and tags from deck name."""
    tags = []
    difficulty = "Intermediate" # Default
    
    # Check JLPT Level
    jlpt_match = re.search(r'N[1-5]', name, re.IGNORECASE)
    if jlpt_match:
        level = jlpt_match.group(0).upper()
        tags.append(f"JLPT {level}")
        if level == "N5": difficulty = "Basic"
        elif level == "N4": difficulty = "Beginner"
        elif level == "N3": difficulty = "Intermediate"
        elif level == "N2": difficulty = "Advanced"
        elif level == "N1": difficulty = "Expert"
    
    # Common keywords
    if "daily" in name.lower(): tags.append("Daily")
    if "core" in name.lower(): tags.append("Core")
    if "business" in name.lower(): 
        tags.append("Business")
        difficulty = "Advanced"
        
    return difficulty, tags

@router.get("/", response_model=List[schemas.Deck])
def list_decks(db: Session = Depends(get_db)):
    """List all available decks with card counts."""
    # Query decks with card counts using a left outer join
    results = (
        db.query(models.Deck, func.count(models.Card.id).label("card_count"))
        .outerjoin(models.Card)
        .group_by(models.Deck.id)
        .all()
    )
    
    deck_list = []
    has_updates = False

    for deck, count in results:
        # If DB fields are empty, infer from name and PERSIST IT (Self-healing)
        if not deck.difficulty or not deck.tags:
             inferred_diff, inferred_tags = infer_metadata(deck.name)
             
             if not deck.difficulty:
                 deck.difficulty = inferred_diff
                 has_updates = True
                 
             if not deck.tags:
                 deck.tags = inferred_tags
                 has_updates = True
        
        # Construct schema
        deck_data = schemas.Deck(
            id=deck.id,
            name=deck.name,
            description=deck.description,
            count=count,
            difficulty=deck.difficulty,
            tags=deck.tags or []
        )
        deck_list.append(deck_data)
    
    # Commit any self-healing updates to optimize future reads
    if has_updates:
        db.commit()
        
    return deck_list

@router.get("/settings", response_model=schemas.DeckSettings)
def get_deck_settings(current_user: models.User = Depends(get_current_user)):
    """Get the current user's deck settings."""
    active_ids = current_user.active_deck_ids or []
    # active_deck_ids is stored as JSON, which might be a list of strings or UUIDs.
    
    # Safely convert to UUIDs
    safe_ids = []
    for uid in active_ids:
        try:
            if isinstance(uid, str):
                safe_ids.append(uuid.UUID(uid))
            elif isinstance(uid, uuid.UUID):
                safe_ids.append(uid)
        except ValueError:
            pass
            
    return schemas.DeckSettings(active_deck_ids=safe_ids)

@router.put("/settings", response_model=schemas.DeckSettings)
def update_deck_settings(
    settings: schemas.DeckSettings,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update the current user's deck settings."""
    # Store as list of strings in JSON
    current_user.active_deck_ids = [str(uid) for uid in settings.active_deck_ids]
    db.commit()
    db.refresh(current_user)
    
    # Return as UUIDs
    return schemas.DeckSettings(active_deck_ids=settings.active_deck_ids)
