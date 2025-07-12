import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { Timer } from '@/components/ui/timer';
import { apiRequest } from '@/lib/queryClient';
import { Crown, Users, Clock, Play, Square, SkipForward } from 'lucide-react';

interface GameState {
  id: number;
  roomCode: string;
  currentQuestion: number;
  totalQuestions: number;
  gameState: 'waiting' | 'active' | 'scoring' | 'finished';
  timer: number;
  correctAnswer: string | null;
}

interface Player {
  id: number;
  name: string;
  totalScore: number;
  rank?: number;
}

export default function Host() {
  const [, setLocation] = useLocation();
  const [game, setGame] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerStats, setAnswerStats] = useState({ answeredCount: 0, totalPlayers: 0 });
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('roomCode');

  const { isConnected, sendMessage } = useWebSocket((message) => {
    handleWebSocketMessage(message);
  });

  useEffect(() => {
    if (!roomCode) {
      setLocation('/');
      return;
    }

    // Join as host
    if (isConnected) {
      sendMessage({
        type: 'join_game',
        data: { roomCode, playerName: 'HOST' }
      });
    }

    // Fetch initial game state
    fetchGameState();
  }, [roomCode, isConnected]);

  const fetchGameState = async () => {
    try {
      const response = await apiRequest('GET', `/api/games/${roomCode}`);
      const data = await response.json();
      setGame(data.game);
      setPlayers(data.players);
      setAnswerStats({
        answeredCount: 0,
        totalPlayers: data.players.length
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load game',
        variant: 'destructive',
      });
    }
  };

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'host_joined':
        setGame(message.data.game);
        break;
      case 'player_joined':
        setPlayers(prev => [...prev, message.data.player]);
        setAnswerStats(prev => ({ ...prev, totalPlayers: message.data.playerCount }));
        toast({
          title: 'Player Joined',
          description: `${message.data.player.name} joined the game`,
        });
        break;
      case 'player_left':
        setPlayers(prev => prev.filter(p => p.id !== message.data.playerId));
        setAnswerStats(prev => ({ ...prev, totalPlayers: message.data.playerCount }));
        break;
      case 'answer_stats':
        setAnswerStats(message.data);
        break;
      case 'question_scored':
        setLeaderboard(message.data.leaderboard);
        setGame(prev => prev ? { ...prev, gameState: 'scoring' } : null);
        break;
      case 'game_ended':
        setLeaderboard(message.data.leaderboard);
        setGame(prev => prev ? { ...prev, gameState: 'finished' } : null);
        break;
    }
  };

  const nextQuestion = () => {
    sendMessage({
      type: 'host_action',
      data: { action: 'next_question' }
    });
    setSelectedAnswer(null);
    setAnswerStats({ answeredCount: 0, totalPlayers: players.length });
  };

  const setCorrectAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    sendMessage({
      type: 'host_action',
      data: { action: 'set_answer', value: answer }
    });
  };

  const endGame = () => {
    sendMessage({
      type: 'host_action',
      data: { action: 'end_game' }
    });
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-quiz-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Crown className="w-8 h-8 text-quiz-primary" />
              <h1 className="text-xl font-bold text-slate-800">Koopan</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-600">
                <span className="hidden sm:inline">Room Code: </span>
                <span className="font-mono font-bold text-quiz-primary">{game.roomCode}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <Users className="w-4 h-4" />
                <span>{players.length}</span>
                <span className="hidden sm:inline">players</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-quiz-secondary animate-pulse' : 'bg-slate-400'}`}></div>
                <span className="text-sm font-medium text-slate-600">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Host Control Panel */}
        <div className="mb-8">
          <Card className="border border-slate-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                  <Crown className="w-8 h-8 text-quiz-accent mr-3" />
                  Host Control Panel
                </h2>
                <Badge variant={game.gameState === 'active' ? 'default' : 'secondary'}>
                  {game.gameState}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Current Question Display */}
                <div className="lg:col-span-2">
                  <div className="bg-gradient-to-r from-quiz-primary to-indigo-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium opacity-90">
                        Question {game.currentQuestion} of {game.totalQuestions}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono font-bold">{game.timer}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-4">
                      {game.gameState === 'waiting' 
                        ? 'Ready to start next question' 
                        : `Question ${game.currentQuestion} in progress`}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {['A', 'B', 'C', 'D'].map((letter) => (
                        <div key={letter} className="bg-white bg-opacity-20 rounded-lg p-3">
                          <span className="font-bold">{letter})</span> Answer {letter}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Control Actions */}
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button 
                        onClick={nextQuestion}
                        className="w-full bg-quiz-secondary hover:bg-quiz-secondary/90"
                        disabled={game.gameState === 'active'}
                      >
                        <SkipForward className="w-4 h-4 mr-2" />
                        Next Question
                      </Button>
                      <Button 
                        onClick={endGame}
                        variant="destructive"
                        className="w-full"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        End Game
                      </Button>
                    </div>
                  </div>
                  
                  {/* Correct Answer Input */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-3">Set Correct Answer</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['A', 'B', 'C', 'D'].map((letter) => (
                        <Button
                          key={letter}
                          onClick={() => setCorrectAnswer(letter)}
                          variant={selectedAnswer === letter ? 'default' : 'outline'}
                          className="font-bold"
                          disabled={game.gameState !== 'active' && answerStats.answeredCount === 0}
                        >
                          {letter}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Real-time Stats */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-quiz-primary">{answerStats.answeredCount}</div>
                  <div className="text-sm text-slate-600">Answered</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-500">{answerStats.totalPlayers - answerStats.answeredCount}</div>
                  <div className="text-sm text-slate-600">Waiting</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-quiz-secondary">{players.length}</div>
                  <div className="text-sm text-slate-600">Total Players</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-quiz-accent">{game.currentQuestion}</div>
                  <div className="text-sm text-slate-600">Current Question</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        {(leaderboard.length > 0 || game.gameState === 'finished') && (
          <Card className="border border-slate-200 shadow-lg">
            <div className="bg-gradient-to-r from-quiz-primary to-indigo-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Crown className="w-6 h-6 mr-3" />
                Leaderboard
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="space-y-3">
                {leaderboard.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-quiz-accent' : 
                        index === 1 ? 'bg-slate-400' : 
                        index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{player.name}</div>
                        <div className="text-sm text-slate-600">{player.totalScore} points</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
