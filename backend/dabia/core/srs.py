from datetime import datetime, timedelta, UTC

# --- Learning Steps (in minutes) ---
# These are the intervals for cards in the "Needs Practice" (Level 1) state.
LEARNING_STEPS = [1, 10]  # e.g., 1 minute, then 10 minutes

# --- Proficiency Level Thresholds (in days) ---
# These intervals determine when a card graduates to the next proficiency level.
LEVEL_2_INTERVAL = 1
LEVEL_3_INTERVAL = 5
LEVEL_4_INTERVAL = 21

def get_new_srs_data(assoc, is_correct):
    """
    Calculates the new SRS data for a card based on the user's answer.
    """
    if is_correct:
        if assoc.proficiency_level == 1:  # Needs Practice
            # Find current step
            current_step_index = -1
            if assoc.interval in LEARNING_STEPS:
                current_step_index = LEARNING_STEPS.index(assoc.interval)

            next_step_index = current_step_index + 1
            if next_step_index < len(LEARNING_STEPS):
                # Advance to the next learning step
                assoc.interval = LEARNING_STEPS[next_step_index]
                assoc.next_review_at = datetime.now(UTC) + timedelta(minutes=assoc.interval)
            else:
                # Graduate to "Time to Learn" (Level 2)
                assoc.proficiency_level = 2
                assoc.interval = LEVEL_2_INTERVAL * 24 * 60 # convert to minutes
                assoc.next_review_at = datetime.now(UTC) + timedelta(days=LEVEL_2_INTERVAL)
        
        else: # Reviewing (Levels 2, 3, 4)
            new_interval_days = round(assoc.interval / (24 * 60) * assoc.ease_factor)
            assoc.interval = new_interval_days * 24 * 60
            assoc.next_review_at = datetime.now(UTC) + timedelta(days=new_interval_days)

            # Check for promotion
            if new_interval_days >= LEVEL_4_INTERVAL:
                assoc.proficiency_level = 4
            elif new_interval_days >= LEVEL_3_INTERVAL:
                assoc.proficiency_level = 3
            else:
                assoc.proficiency_level = 2 # Stays or gets promoted to level 2
            
            # Slightly increase ease factor
            assoc.ease_factor += 0.1

    else: # Incorrect answer
        assoc.lapses += 1
        assoc.proficiency_level = 1
        assoc.interval = LEARNING_STEPS[0] # Reset to the first learning step
        assoc.next_review_at = datetime.now(UTC) + timedelta(minutes=assoc.interval)
        
        # Decrease ease factor, with a floor of 1.3
        assoc.ease_factor = max(1.3, assoc.ease_factor - 0.2)

    return assoc
