"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Direction = "up" | "down" | "left" | "right";
type Position = { x: number; y: number };

const BOARD_SIZE = 20;
const INITIAL_SPEED = 150;

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [direction, setDirection] = useState<Direction>("right");
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

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
    generateFood();
  };

  const startGame = () => {
    resetGame();
    setIsPlaying(true);
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
  }, [direction, food, generateFood, isPlaying]);

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
      </div>
    </div>
  );
}