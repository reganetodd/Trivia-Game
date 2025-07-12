import { games, players, answers, type Game, type Player, type Answer, type InsertGame, type InsertPlayer, type InsertAnswer } from "@shared/schema";

export interface IStorage {
  // Game operations
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  getGameByRoomCode(roomCode: string): Promise<Game | undefined>;
  updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined>;
  
  // Player operations
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayersByGame(gameId: number): Promise<Player[]>;
  getPlayerBySocketId(socketId: string): Promise<Player | undefined>;
  updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined>;
  removePlayer(id: number): Promise<void>;
  
  // Answer operations
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswersByGameAndQuestion(gameId: number, questionNumber: number): Promise<Answer[]>;
  getPlayerAnswerForQuestion(gameId: number, playerId: number, questionNumber: number): Promise<Answer | undefined>;
}

export class MemStorage implements IStorage {
  private games: Map<number, Game>;
  private players: Map<number, Player>;
  private answers: Map<number, Answer>;
  private currentGameId: number;
  private currentPlayerId: number;
  private currentAnswerId: number;

  constructor() {
    this.games = new Map();
    this.players = new Map();
    this.answers = new Map();
    this.currentGameId = 1;
    this.currentPlayerId = 1;
    this.currentAnswerId = 1;
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = this.currentGameId++;
    const game: Game = {
      id,
      roomCode: insertGame.roomCode,
      hostId: insertGame.hostId,
      currentQuestion: insertGame.currentQuestion || 0,
      totalQuestions: insertGame.totalQuestions || 10,
      gameState: insertGame.gameState || "waiting",
      timer: insertGame.timer || 0,
      correctAnswer: insertGame.correctAnswer || null,
      createdAt: new Date(),
    };
    this.games.set(id, game);
    return game;
  }

  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getGameByRoomCode(roomCode: string): Promise<Game | undefined> {
    return Array.from(this.games.values()).find(game => game.roomCode === roomCode);
  }

  async updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const updatedGame = { ...game, ...updates };
    this.games.set(id, updatedGame);
    return updatedGame;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.currentPlayerId++;
    const player: Player = {
      id,
      gameId: insertPlayer.gameId || null,
      name: insertPlayer.name,
      socketId: insertPlayer.socketId,
      totalScore: insertPlayer.totalScore || 0,
      joinedAt: new Date(),
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayersByGame(gameId: number): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player => player.gameId === gameId);
  }

  async getPlayerBySocketId(socketId: string): Promise<Player | undefined> {
    return Array.from(this.players.values()).find(player => player.socketId === socketId);
  }

  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    
    const updatedPlayer = { ...player, ...updates };
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  async removePlayer(id: number): Promise<void> {
    this.players.delete(id);
  }

  async createAnswer(insertAnswer: InsertAnswer): Promise<Answer> {
    const id = this.currentAnswerId++;
    const answer: Answer = {
      id,
      gameId: insertAnswer.gameId || null,
      playerId: insertAnswer.playerId || null,
      questionNumber: insertAnswer.questionNumber,
      answer: insertAnswer.answer,
      timeToAnswer: insertAnswer.timeToAnswer,
      isCorrect: insertAnswer.isCorrect || false,
      points: insertAnswer.points || 0,
      answeredAt: new Date(),
    };
    this.answers.set(id, answer);
    return answer;
  }

  async getAnswersByGameAndQuestion(gameId: number, questionNumber: number): Promise<Answer[]> {
    return Array.from(this.answers.values()).filter(
      answer => answer.gameId === gameId && answer.questionNumber === questionNumber
    );
  }

  async getPlayerAnswerForQuestion(gameId: number, playerId: number, questionNumber: number): Promise<Answer | undefined> {
    return Array.from(this.answers.values()).find(
      answer => answer.gameId === gameId && answer.playerId === playerId && answer.questionNumber === questionNumber
    );
  }
}

export const storage = new MemStorage();
