# SRS Algorithm v3 Specification

## 1. Proficiency Levels (1-5)

| Level | Name | Description | User Definition |
| :--- | :--- | :--- | :--- |
| **5** | Mastered | 记忆满点！ | Perfect memory. |
| **4** | Easy | 唾手可得！ | Easily recalled. |
| **3** | Learning | 就要学起来了！ | Getting there. |
| **2** | Hard | 这个单词需要多练练！ | Needs practice. |
| **1** | New | 没见过的新单词！ | First sight only. |

## 2. State Machine Transitions

Logic applies when a user submits an answer.

### L1 (New)
- **Condition**: First time seeing the card.
- **Correct**: -> **L5** (Graduate immediately).
- **Incorrect**: -> **L2**.

### L2 (Hard)
- **Correct**: -> **L3**.
- **Incorrect**: -> **L2** (Stay).

### L3 (Learning)
- **Correct**: -> **L4**.
- **Incorrect**: -> **L3** (Stay).

### L4 (Easy)
- **Correct**: -> **L5**.
- **Incorrect**: -> **L3** (Regression).

### L5 (Mastered)
- **Correct**: -> **L5** (Maintain).
- **Incorrect**: -> **L3** (Regression).

## 3. Scheduling Intervals

Intervals define `next_review_at`. For intra-session "cards count", we approximate using time (1 card ≈ 15s).

| Transition Target | Strategy | Detail | Approx Time Delta |
| :--- | :--- | :--- | :--- |
| **To L2** | Short Queue | "Next 5 cards" | +1.5 minutes |
| **To L3** | Medium Queue | "Next 15 cards" | +5 minutes |
| **To L4** | Inter-session | "One week" | +7 days |
| **To L5** | Long Term | "Long term" | +30 days |

## 4. Implementation Details

### Database Fields
- `proficiency_level`: Stores current 1-5 state.
- `next_review_at`: Calculated timestamp.
- `last_reviewed_at`: Timestamp of action.

### Queue Logic (Intra-session)
Since we simply query `next_review_at <= now()`, setting short timeouts (1-5 mins) naturally places cards back in the queue for the current session or shortly after.

### Logging
Must record:
- Previous Level
- New Level
- Correctness
- Calculated Interval
- Reason (e.g., "L2 -> L3 Upgrade")
