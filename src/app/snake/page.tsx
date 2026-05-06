"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Direction = "up" | "down" | "left" | "right";
type Position = { x: number; y: number };

interface ScoreEntry {
  score: number;
  date: string;
  gameTime: number;
}

const BOARD_SIZE = 20;
const INITIAL_SPEED = 150;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [direction, setDirection] = useState<Direction>("right");
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [gameTime, setGameTime] = useState(0);
  const [highScores, setHighScores] = useState<ScoreEntry[]>([]);
  const [showScores, setShowScores] = useState(false);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const fetchHighScores = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/scores`);
      if (response.ok) {
        const scores = await response.json();
        setHighScores(scores);
      }
    } catch (error) {
      console.error("Failed to fetch scores:", error);
    }
  }, []);

  const saveScore = useCallback(async (finalScore: number, time: number) => {
    try {
      await fetch(`${API_BASE}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: finalScore, gameTime: time }),
      });
      fetchHighScores();
    } catch (error) {
      console.error("Failed to save score:", error);
    }
  }, [fetchHighScores]);

  useEffect(() => {
    fetchHighScores();
  }, [fetchHighScores]);

  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE),
    };
    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection("right");
    setScore(0);
    setGameOver(false);
    setGameTime(0);
    generateFood();
  };

  const startGame = () => {
    resetGame();
    setIsPlaying(true);
    startTimeRef.current = Date.now();
    
    // Start timer
    timerRef.current = setInterval(() => {
      setGameTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const gameLoop = useCallback(() => {
    if (!isPlaying || gameOver) return;

    setSnake((prevSnake) => {
      const head = { ...prevSnake[0] };

      // Move head based on direction
      switch (direction) {
        case "up":
          head.y = (head.y - 1 + BOARD_SIZE) % BOARD_SIZE;
          break;
        case "down":
          head.y = (head.y + 1) % BOARD_SIZE;
          break;
        case "left":
          head.x = (head.x - 1 + BOARD_SIZE) % BOARD_SIZE;
          break;
        case "right":
          head.x = (head.x + 1) % BOARD_SIZE;
          break;
      }

      // Check collision with self
      if (prevSnake.some((segment) => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
        saveScore(score, gameTime);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check if food eaten
      if (head.x === food.x && head.y === food.y) {
        setScore((s) => s + 10);
        generateFood();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, generateFood, isPlaying, gameOver, score, gameTime, saveScore]);

  useEffect(() => {
    if (isPlaying && !gameOver) {
      gameLoopRef.current = setInterval(gameLoop, INITIAL_SPEED);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, gameOver, gameLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    const cellSize = canvas.width / BOARD_SIZE;
    ctx.strokeStyle = "#16213e";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= BOARD_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw food
    ctx.fillStyle = "#e94560";
    ctx.beginPath();
    ctx.arc(
      (food.x + 0.5) * cellSize,
      (food.y + 0.5) * cellSize,
      cellSize * 0.4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw snake
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? "#00d9ff" : "#00bcd4";
      ctx.fillRect(segment.x * cellSize, segment.y * cellSize, cellSize - 1, cellSize - 1);
    });
  }, [snake, food]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      
      const keyDirectionMap: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };

      const newDirection = keyDirectionMap[e.key];
      if (!newDirection) return;

      setDirection((prev) => {
        const oppositeDirections: Record<Direction, Direction> = {
          up: "down",
          down: "up",
          left: "right",
          right: "left",
        };
        if (oppositeDirections[newDirection] === prev) return prev;
        return newDirection;
      });
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isPlaying]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Snake Game
        </h1>
        
        <div className="flex justify-between items-center mb-4">
          <div className="text-xl font-semibold">
            Score: <span className="text-cyan-400">{score}</span>
          </div>
          <div className="text-lg text-gray-400">
            Time: <span className="text-blue-400">{gameTime}s</span>
          </div>
          {!isPlaying && (
            <button
              onClick={startGame}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105"
            >
              Start Game
            </button>
          )}
        </div>

        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="bg-gray-900 rounded-lg border-2 border-gray-700"
        />

        {gameOver && (
          <div className="mt-4 text-center">
            <p className="text-2xl font-bold text-red-400 mb-2">Game Over!</p>
            <p className="text-lg mb-2">Final Score: {score}</p>
            <button
              onClick={startGame}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all"
            >
              Play Again
            </button>
          </div>
        )}

        {isPlaying && !gameOver && (
          <div className="mt-4 text-center text-gray-400">
            <p>Use arrow keys or WASD to control the snake</p>
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={() => setShowScores(!showScores)}
            className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showScores ? "Hide" : "Show"} High Scores
          </button>
          
          {showScores && highScores.length > 0 && (
            <div className="mt-2 bg-gray-900 rounded-lg p-4 max-h-40 overflow-y-auto">
              <h3 className="font-semibold mb-2 text-center">Top Scores</h3>
              <ol className="space-y-1">
                {highScores.map((entry, index) => (
                  <li key={index} className="flex justify-between text-sm">
                    <span className="text-yellow-400">#{index + 1} {entry.score}</span>
                    <span className="text-gray-400">{entry.gameTime}s</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}