package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

type ScoreEntry struct {
	Score     int       `json:"score"`
	Date      time.Time `json:"date"`
	GameTime  int       `json:"gameTime"` // seconds played
}

type ScoreHistory struct {
	Scores []ScoreEntry `json:"scores"`
	mu     sync.Mutex
	file   string
}

func NewScoreHistory(filename string) *ScoreHistory {
	return &ScoreHistory{
		Scores: []ScoreEntry{},
		file:   filename,
	}
}

func (sh *ScoreHistory) Load() error {
	sh.mu.Lock()
	defer sh.mu.Unlock()

	data, err := os.ReadFile(sh.file)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // No file yet, start empty
		}
		return err
	}

	return json.Unmarshal(data, &sh.Scores)
}

func (sh *ScoreHistory) Save() error {
	sh.mu.Lock()
	defer sh.mu.Unlock()

	data, err := json.MarshalIndent(sh.Scores, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(sh.file, data, 0644)
}

func (sh *ScoreHistory) AddScore(score, gameTime int) ScoreEntry {
	sh.mu.Lock()
	defer sh.mu.Unlock()

	entry := ScoreEntry{
		Score:    score,
		Date:     time.Now(),
		GameTime: gameTime,
	}

	sh.Scores = append(sh.Scores, entry)
	sh.Save()

	return entry
}

func (sh *ScoreHistory) GetTopScores(limit int) []ScoreEntry {
	sh.mu.Lock()
	defer sh.mu.Unlock()

	// Sort by score descending
	sorted := make([]ScoreEntry, len(sh.Scores))
	copy(sorted, sh.Scores)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Score > sorted[j].Score
	})

	if limit > 0 && len(sorted) > limit {
		return sorted[:limit]
	}
	return sorted
}

func (sh *ScoreHistory) GetAllScores() []ScoreEntry {
	return sh.GetTopScores(0)
}

func main() {
	// Get the data file path (in backend/data directory)
	// Use absolute path to handle running from different directories
	exe, err := os.Executable()
	if err != nil {
		log.Fatal(err)
	}
	dataDir := filepath.Join(filepath.Dir(exe), "data")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Fatal(err)
	}

	scoreHistory := NewScoreHistory(filepath.Join(dataDir, "scores.json"))
	if err := scoreHistory.Load(); err != nil {
		log.Printf("Warning: Could not load scores: %v", err)
	}

	// CORS middleware
	corsMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			
			if r.Method == "OPTIONS" {
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	// Routes
	http.Handle("/api/scores", corsMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(scoreHistory.GetTopScores(10))
		case "POST":
			var data struct {
				Score    int `json:"score"`
				GameTime int `json:"gameTime"`
			}
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			entry := scoreHistory.AddScore(data.Score, data.GameTime)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(entry)
		}
	})))

	http.Handle("/api/health", corsMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}