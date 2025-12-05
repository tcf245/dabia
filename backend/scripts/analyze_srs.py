import csv
import math
from datetime import datetime
from collections import defaultdict

# --- SRS Logic Constants (from scheduler.py) ---
S_INIT = 0.6
P_TARGET = 0.9
S_MIN = 0.05
S_MAX = 3650.0
ALPHA = 0.2
BETA = 0.5

def calculate_proficiency(stability):
    if stability < 0.5: return 0
    if stability < 2: return 1
    if stability < 7: return 2
    if stability < 14: return 3
    if stability < 30: return 4
    return 5

def simulate_srs(reviews):
    stability = 0.0
    repetitions = 0
    lapses_count = 0
    
    for review in reviews:
        is_correct = review['is_correct']
        # quality mapping: 
        # In scheduler.py: is_correct = quality >= 3. 
        # But we only have is_correct boolean in CSV.
        # We need to infer quality.
        # If is_correct is True, let's assume quality 3 or 4?
        # Wait, scheduler.py uses `quality` input.
        # The CSV has `is_correct`.
        # Let's look at how `is_correct` was derived or if we can infer quality.
        # The CSV provided by user has: id, user_id, card_id, is_correct, response_time_ms, reviewed_at
        # It does NOT have quality.
        # However, `scheduler.py` says: `is_correct = quality >= 3`.
        # And the math uses `quality`.
        # If we don't have quality, we can't EXACTLY reproduce the calculation if quality varies (3, 4, 5).
        # BUT, maybe the app only sends 3 for "Good" and 1 for "Again"?
        # Or maybe 5 for "Easy"?
        # Let's assume for now:
        # If is_correct: quality = 4 (Standard "Good")
        # If not is_correct: quality = 1 (Standard "Again")
        
        # Actually, let's check if we can find where `update_card_state` is called to see what quality is passed.
        # But for now, let's assume quality=4 for correct, quality=1 for incorrect.
        
        if is_correct:
            quality = 4
            repetitions += 1
            if repetitions == 1:
                stability = S_INIT
            else:
                growth_factor = 1 + ALPHA * (quality - 2)
                stability = min(S_MAX, stability * growth_factor)
                
                # Recovery Logic
                recovery_floor = S_INIT * (1.15 ** (repetitions - 1))
                if stability < recovery_floor:
                    stability = recovery_floor
        else:
            quality = 1
            repetitions = 0
            lapses_count += 1
            stability = max(S_MIN, stability * BETA)
            
    interval = max(0.007, -stability * math.log(P_TARGET))
    proficiency = calculate_proficiency(stability)
    
    return {
        'stability': stability,
        'interval': interval,
        'proficiency': proficiency,
        'repetitions': repetitions,
        'lapses_count': lapses_count
    }

def load_reviews(filepath):
    reviews_by_card = defaultdict(list)
    with open(filepath, 'r') as f:
        # Try to detect delimiter manually if sniffer fails
        sample = f.read(1024)
        f.seek(0)
        
        delimiter = '\t' if '\t' in sample else ','
        print(f"Detected delimiter for {filepath}: {repr(delimiter)}")
        
        reader = csv.reader(f, delimiter=delimiter)
        
        for row in reader:
            if not row: continue
            # Row format based on user paste:
            # id, user_id, card_id, is_correct, response_time_ms, reviewed_at
            
            try:
                if len(row) < 6: continue
                
                # Check if it's a header row
                if 'card_id' in row or 'reviewed_at' in row:
                    continue
                
                card_id = row[2]
                is_correct_str = row[3].lower()
                is_correct = is_correct_str == 'true' or is_correct_str == 't'
                reviewed_at_str = row[5]
                
                reviews_by_card[card_id].append({
                    'is_correct': is_correct,
                    'reviewed_at': reviewed_at_str
                })
            except Exception as e:
                # print(f"Skipping row: {row} due to error: {e}")
                pass
                
    # Sort reviews by date
    for card_id in reviews_by_card:
        reviews_by_card[card_id].sort(key=lambda x: x['reviewed_at'])
        
    return reviews_by_card

def load_associations(filepath):
    assocs = {}
    with open(filepath, 'r') as f:
        sample = f.read(1024)
        f.seek(0)
        
        delimiter = '\t' if '\t' in sample else ','
        print(f"Detected delimiter for {filepath}: {repr(delimiter)}")
        
        reader = csv.reader(f, delimiter=delimiter)
            
        for row in reader:
            if not row: continue
            # Format: user_id, card_id, proficiency, next_review, last_review, created, stability, interval, reps, lapses, updated, ease
            
            try:
                # Check if it's a header row
                if 'card_id' in row or 'stability' in row:
                    continue

                card_id = row[1]
                # Based on observation:
                # 6: Interval
                # 7: Ease Factor
                # 11: Stability
                interval = float(row[6])
                stability = float(row[11])
                
                assocs[card_id] = {
                    'stability': stability,
                    'interval': interval
                }
            except Exception as e:
                # print(f"Skipping assoc row: {row} due to error: {e}")
                pass
    return assocs

def main():
    reviews_path = 'backend/scripts/analysis_data/review_log.csv'
    assocs_path = 'backend/scripts/analysis_data/user_card_associations.csv'
    
    print("Loading data...")
    reviews = load_reviews(reviews_path)
    assocs = load_associations(assocs_path)
    
    print(f"Loaded reviews for {len(reviews)} cards.")
    print(f"Loaded associations for {len(assocs)} cards.")
    
    print("\nAnalyzing...")
    discrepancies = []
    
    for card_id, card_reviews in reviews.items():
        if card_id not in assocs:
            continue
            
        actual = assocs[card_id]
        simulated = simulate_srs(card_reviews)
        
        # Compare
        # Allow small float difference
        diff_stability = abs(actual['stability'] - simulated['stability'])
        
        if diff_stability > 0.001:
            discrepancies.append({
                'card_id': card_id,
                'actual_stability': actual['stability'],
                'simulated_stability': simulated['stability'],
                'diff': diff_stability,
                'review_count': len(card_reviews)
            })
            
    if discrepancies:
        print(f"\nFound {len(discrepancies)} discrepancies!")
        print("-" * 60)
        print(f"{'Card ID':<38} | {'Actual S':<10} | {'Sim S':<10} | {'Diff':<10} | {'Reviews'}")
        print("-" * 60)
        for d in discrepancies[:20]: # Show top 20
            print(f"{d['card_id']:<38} | {d['actual_stability']:.4f}     | {d['simulated_stability']:.4f}     | {d['diff']:.4f}     | {d['review_count']}")
        if len(discrepancies) > 20:
            print(f"... and {len(discrepancies) - 20} more.")
    else:
        print("\nNo discrepancies found! The algorithm matches the data exactly (assuming quality=4 for correct).")

if __name__ == "__main__":
    main()
