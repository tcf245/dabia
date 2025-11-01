# Dabia (ダビア)

An intelligent language learning application inspired by a three-year-old's lovely made-up word, "dabiya".

This project aims to build a smart vocabulary learning tool, starting with Japanese, based on scientific principles of memory and AI-driven personalization.

This project is a monorepo containing the frontend and backend for the Dabia application.



- `backend/`: The FastAPI backend application.

- `frontend/`: The React frontend application (work in progress).



## Backend Development



All commands related to the backend should be run from within the `backend/` directory.



```bash

cd backend

```



### Local Development Setup



This project uses Docker Compose to manage the local development environment.



1.  **Start the PostgreSQL database**:



    Make sure you have Docker installed. Then, from the `backend/` directory, run:



    ```bash

    docker-compose up -d

    ```



2.  **Environment Variables**:



    Copy the environment variable template to a new `.env` file:



    ```bash

    cp .env.example .env

    ```



    The application will load these variables to connect to the database.



### How to Run



1.  **Install Python dependencies**:

    ```bash

    pip install -r requirements.txt

    ```

2.  **Apply database migrations**:

    ```bash

    alembic upgrade head

    ```

3.  **Start the FastAPI server**:

    ```bash

    uvicorn dabia.main:app --reload

    ```



    The API will be accessible at `http://127.0.0.1:8000`.

    You can view the interactive API documentation (Swagger UI) at `http://127.0.0.1:8000/docs`.
