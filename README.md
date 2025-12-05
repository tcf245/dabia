# Dabia (ダビア)

An intelligent language learning application inspired by a three-year-old's lovely made-up word, "dabiya".

This project aims to build a smart vocabulary learning tool, starting with Japanese, based on scientific principles of memory and AI-driven personalization.

This project is a monorepo containing the frontend and backend for the Dabia application.



- `backend/`: The FastAPI backend application.

- `frontend/`: The React frontend application.


## Frontend Development

All commands related to the frontend should be run from within the `frontend/` directory.

```bash
cd frontend
```

### How to Run

1.  **Install Node.js dependencies**:

    ```bash
    npm install
    ```

2.  **Start the development server**:

    ```bash
    npm run dev
    ```

    The application will be accessible at `http://localhost:5173`.

### Environment Variables

The frontend uses environment variables to configure the backend API URL.

1.  Copy the `.env.example` file to `.env`:

    ```bash
    cp .env.example .env
    ```

2.  Edit `.env` to set the `VITE_API_BASE_URL` if your backend is running on a different host or port (default is `http://localhost:8000`).



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

    The API will be accessible at `http://127.0.0.1:8000`.

    You can view the interactive API documentation (Swagger UI) at `http://127.0.0.1:8000/docs`.

### Google Authentication & Demo Mode

The application supports **Google Login** but defaults to a **Demo Mode** if no user is logged in.

1.  **Demo Mode**:
    *   By default, the app runs in Demo Mode using a guest account.
    *   Users can review cards without logging in.

2.  **Google Login**:
    *   To enable Google Login, you must configure a **Google Client ID**.
    *   Follow the [Google Auth Setup Guide](docs/dev_logs/google_auth_setup.md) to obtain your Client ID.
    *   **Backend**: Set `GOOGLE_CLIENT_ID` and `SECRET_KEY` in `backend/.env`.
    *   **Frontend**: Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`.

    *Note: If `GOOGLE_CLIENT_ID` is not configured, the backend will start with a placeholder value, but login will fail.*

## Credits

This project uses card data from the [anki-jlpt-decks](https://github.com/5mdld/anki-jlpt-decks) project, created by **egg rolls**. The card data is licensed under the [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) license. We have used the data in this project and have not made any modifications to the original card content.
