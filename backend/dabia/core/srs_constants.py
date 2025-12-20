from datetime import timedelta

# SRS Intervals (v3) based on Proficiency Levels
# Times are in seconds (for use with timedelta)

INTERVAL_L2_SECONDS = 90    # ~5 cards * 18s/card
INTERVAL_L3_SECONDS = 300   # ~15 cards * 20s/card

# Long Term Intervals (Days)
INTERVAL_L4_DAYS = 7
INTERVAL_L5_DAYS = 30

# Proficiency Levels
PROFICIENCY_NEW = 1
PROFICIENCY_HARD = 2
PROFICIENCY_LEARNING = 3
PROFICIENCY_EASY = 4
PROFICIENCY_MASTERED = 5

# Quality Ratings
QUALITY_FAIL = 1
QUALITY_HARD = 2
QUALITY_OK = 3
QUALITY_GOOD = 4
QUALITY_PERFECT = 5
