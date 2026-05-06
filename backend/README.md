# Snake Game Backend

Go backend API for storing snake game scores.

## API Endpoints

- `GET /api/scores` - Get top 10 high scores
- `POST /api/scores` - Save a new score (body: `{score: number, gameTime: number}`)
- `GET /api/health` - Health check

## Running the Backend

```bash
cd backend
go run main.go
```

The server runs on port 8080 by default, or set the `PORT` environment variable.

## Data Storage

Scores are stored in `backend/data/scores.json` as local file storage.