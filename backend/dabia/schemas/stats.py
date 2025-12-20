from pydantic import BaseModel, ConfigDict

class DailyStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    to_learn_count: int
    learned_count: int
    reinforced_count: int
    total_answered: int
    total_time_seconds: int
    new_words_count: int
    accuracy: float
