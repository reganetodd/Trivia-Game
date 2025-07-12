import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { messageSchema, type WebSocketMessage } from "@shared/schema";
import { z } from "zod";

interface WebSocketWithId extends WebSocket {
  id?: string;
  gameId?: number;
  playerId?: number;
  isHost?: boolean;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Generate room code
  function generateRoomCode(): string {
    return `QZ-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  // Calculate points based on speed (faster = more points)
  function calculatePoints(timeToAnswer: number, maxTime: number = 15000): number {
    const speedFactor = Math.max(0, (maxTime - timeToAnswer) / maxTime);
    return Math.round(100 + (speedFactor * 100)); // 100-200 points based on speed
  }

  // Broadcast to all clients in a game
  function broadcastToGame(gameId: number, message: any, excludeSocket?: WebSocketWithId) {
    wss.clients.forEach((client: WebSocketWithId) => {
      if (client.readyState === WebSocket.OPEN && 
          client.gameId === gameId && 
          client !== excludeSocket) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // API Routes
  app.post("/api/games", async (req, res) => {
    try {
      const roomCode = generateRoomCode();
      const hostId = req.body.hostId || `host-${Date.now()}`;
      
      const game = await storage.createGame({
        roomCode,
        hostId,
        gameState: "waiting",
        currentQuestion: 0,
        totalQuestions: 10,
        timer: 0,
        correctAnswer: null,
      });

      res.json({ game, roomCode });
    } catch (error) {
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  app.get("/api/games/:roomCode", async (req, res) => {
    try {
      const game = await storage.getGameByRoomCode(req.params.roomCode);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      const players = await storage.getPlayersByGame(game.id);
      res.json({ game, players });
    } catch (error) {
      res.status(500).json({ error: "Failed to get game" });
    }
  });

  app.get("/api/games/:gameId/leaderboard", async (req, res) => {
    try {
      const gameId = parseInt(req.params.gameId);
      const players = await storage.getPlayersByGame(gameId);
      
      // Sort by total score descending
      const leaderboard = players
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .map((player, index) => ({
          ...player,
          rank: index + 1,
        }));

      res.json({ leaderboard });
    } catch (error) {
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // WebSocket handling
  wss.on('connection', (ws: WebSocketWithId) => {
    ws.id = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    ws.on('message', async (message: string) => {
      try {
        const parsed = JSON.parse(message);
        const validatedMessage = messageSchema.parse(parsed);
        
        await handleWebSocketMessage(ws, validatedMessage);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', async () => {
      // Clean up player when they disconnect
      if (ws.playerId) {
        await storage.removePlayer(ws.playerId);
        
        if (ws.gameId) {
          const players = await storage.getPlayersByGame(ws.gameId);
          broadcastToGame(ws.gameId, {
            type: 'player_left',
            data: { playerId: ws.playerId, playerCount: players.length }
          });
        }
      }
    });
  });

  async function handleWebSocketMessage(ws: WebSocketWithId, message: WebSocketMessage) {
    switch (message.type) {
      case 'join_game':
        await handleJoinGame(ws, message.data);
        break;
      case 'host_action':
        await handleHostAction(ws, message.data);
        break;
      case 'submit_answer':
        await handleSubmitAnswer(ws, message.data);
        break;
    }
  }

  async function handleJoinGame(ws: WebSocketWithId, data: { roomCode: string; playerName: string }) {
    try {
      const game = await storage.getGameByRoomCode(data.roomCode);
      if (!game) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Game not found'
        }));
        return;
      }

      // Check if this is the host
      if (data.playerName === 'HOST') {
        ws.isHost = true;
        ws.gameId = game.id;
        
        ws.send(JSON.stringify({
          type: 'host_joined',
          data: { game }
        }));
        return;
      }

      // Create player
      const player = await storage.createPlayer({
        gameId: game.id,
        name: data.playerName,
        socketId: ws.id!,
        totalScore: 0,
      });

      ws.playerId = player.id;
      ws.gameId = game.id;

      // Get updated player list
      const players = await storage.getPlayersByGame(game.id);

      // Notify player they joined
      ws.send(JSON.stringify({
        type: 'joined_game',
        data: { game, player, players }
      }));

      // Broadcast to all players in the game
      broadcastToGame(game.id, {
        type: 'player_joined',
        data: { player, playerCount: players.length }
      });

    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to join game'
      }));
    }
  }

  async function handleHostAction(ws: WebSocketWithId, data: { action: string; value?: string }) {
    if (!ws.isHost || !ws.gameId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authorized'
      }));
      return;
    }

    const game = await storage.getGame(ws.gameId);
    if (!game) return;

    switch (data.action) {
      case 'next_question':
        const nextQuestion = (game.currentQuestion || 0) + 1;
        await storage.updateGame(ws.gameId, {
          currentQuestion: nextQuestion,
          gameState: 'active',
          timer: 15,
          correctAnswer: null,
        });

        broadcastToGame(ws.gameId, {
          type: 'question_started',
          data: { questionNumber: nextQuestion, timer: 15 }
        });

        // Start timer countdown
        startTimer(ws.gameId, 15);
        break;

      case 'set_answer':
        if (!data.value || !['A', 'B', 'C', 'D'].includes(data.value)) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid answer'
          }));
          return;
        }

        await storage.updateGame(ws.gameId, {
          correctAnswer: data.value,
          gameState: 'scoring',
        });

        // Score all answers for current question
        await scoreCurrentQuestion(ws.gameId, data.value);
        break;

      case 'end_game':
        await storage.updateGame(ws.gameId, {
          gameState: 'finished',
        });

        const players = await storage.getPlayersByGame(ws.gameId);
        const leaderboard = players
          .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
          .map((player, index) => ({ ...player, rank: index + 1 }));

        broadcastToGame(ws.gameId, {
          type: 'game_ended',
          data: { leaderboard }
        });
        break;
    }
  }

  async function handleSubmitAnswer(ws: WebSocketWithId, data: { answer: string; timeToAnswer: number }) {
    if (!ws.playerId || !ws.gameId) return;

    const game = await storage.getGame(ws.gameId);
    if (!game || game.gameState !== 'active') return;

    // Check if player already answered this question
    const currentQuestion = game.currentQuestion || 0;
    const existingAnswer = await storage.getPlayerAnswerForQuestion(
      ws.gameId, ws.playerId, currentQuestion
    );
    if (existingAnswer) return;

    // Store the answer (scoring happens when host sets correct answer)
    await storage.createAnswer({
      gameId: ws.gameId,
      playerId: ws.playerId,
      questionNumber: currentQuestion,
      answer: data.answer,
      timeToAnswer: data.timeToAnswer,
      isCorrect: false, // Will be updated during scoring
      points: 0, // Will be calculated during scoring
    });

    // Notify player their answer was received
    ws.send(JSON.stringify({
      type: 'answer_submitted',
      data: { answer: data.answer, timeToAnswer: data.timeToAnswer }
    }));

    // Update host with answer stats
    const answers = await storage.getAnswersByGameAndQuestion(ws.gameId, currentQuestion);
    const players = await storage.getPlayersByGame(ws.gameId);
    
    broadcastToGame(ws.gameId, {
      type: 'answer_stats',
      data: {
        answeredCount: answers.length,
        totalPlayers: players.length,
      }
    }, ws);
  }

  function startTimer(gameId: number, duration: number) {
    const interval = setInterval(async () => {
      const game = await storage.getGame(gameId);
      if (!game || game.gameState !== 'active') {
        clearInterval(interval);
        return;
      }

      const newTimer = (game.timer || 0) - 1;
      await storage.updateGame(gameId, { timer: newTimer });

      if (newTimer <= 0) {
        clearInterval(interval);
        await storage.updateGame(gameId, { gameState: 'waiting' });
        
        broadcastToGame(gameId, {
          type: 'timer_expired',
          data: { questionNumber: game.currentQuestion || 0 }
        });
      } else {
        broadcastToGame(gameId, {
          type: 'timer_update',
          data: { timer: newTimer }
        });
      }
    }, 1000);
  }

  async function scoreCurrentQuestion(gameId: number, correctAnswer: string) {
    const game = await storage.getGame(gameId);
    if (!game) return;

    const answers = await storage.getAnswersByGameAndQuestion(gameId, game.currentQuestion || 0);
    
    for (const answer of answers) {
      const isCorrect = answer.answer === correctAnswer;
      const points = isCorrect ? calculatePoints(answer.timeToAnswer) : 0;
      
      // Update answer with scoring
      await storage.createAnswer({
        ...answer,
        isCorrect,
        points,
      });

      // Update player's total score
      const player = await storage.getPlayer(answer.playerId!);
      if (player) {
        await storage.updatePlayer(answer.playerId!, {
          totalScore: (player.totalScore || 0) + points,
        });
      }
    }

    // Get updated leaderboard
    const players = await storage.getPlayersByGame(gameId);
    const leaderboard = players
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
      .map((player, index) => ({ ...player, rank: index + 1 }));

    // Broadcast results
    broadcastToGame(gameId, {
      type: 'question_scored',
      data: {
        correctAnswer,
        leaderboard,
        questionNumber: game.currentQuestion || 0,
      }
    });
  }

  return httpServer;
}
