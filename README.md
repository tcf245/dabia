# Dabia (哒比呀)

An intelligent language learning application inspired by a three-year-old's lovely made-up word, "dabiya".

This project aims to build a smart vocabulary learning tool, starting with Japanese, based on scientific principles of memory and AI-driven personalization.

## Tech Stack

- **Backend**: Python (FastAPI)
- **Frontend**: React (TypeScript)
- **Database**: PostgreSQL

## How to Run

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd dabia
    ```
2.  **Install Python dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Start the FastAPI server**:
    ```bash
    uvicorn dabia.main:app --reload
    ```

    The API will be accessible at `http://127.0.0.1:8000`.
    You can view the interactive API documentation (Swagger UI) at `http://127.0.0.1:8000/docs`.