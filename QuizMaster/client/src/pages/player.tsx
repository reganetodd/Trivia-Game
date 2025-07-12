import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { Timer } from '@/components/ui/timer';
import { Users, Clock, CheckCircle, Trophy, Award } from 'lucide-react';

interface GameState {
  id: number;
  roomCode: string;
  currentQuestion: number;
  totalQuestions: number;
  gameState: 'waiting' | 'active' | 'scoring' | 'finished';
  timer: number;
}

interface Player {
  id: number;
  name: string;
  totalScore: number;
  rank?: number;
}

export default function Player() {
  const [, setLocation] = useLocation();
  const [game, setGame] = useState<GameState | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [answerTime, setAnswerTime] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('roomCode');
  const playerName = urlParams.get('name');

  const { isConnected, sendMessage } = useWebSocket((message) => {
    handleWebSocketMessage(message);
  });

  useEffect(() => {
    if (!roomCode || !playerName) {
      setLocation('/');
      return;
    }

    // Join game as player
    if (isConnected) {
      sendMessage({
        type: 'join_game',
        data: { roomCode, playerName }
      });
    }
  }, [roomCode, playerName, isConnected]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'joined_game':
        setGame(message.data.game);
        setPlayer(message.data.player);
        break;
      case 'question_started':
        setGame(prev => prev ? { ...prev, gameState: 'active', currentQuestion: message.data.questionNumber, timer: message.data.timer } : null);
        setSelectedAnswer(null);
        setAnswerSubmitted(false);
        setAnswerTime(null);
        setQuestionStartTime(Date.now());
        break;
      case 'timer_update':
        setGame(prev => prev ? { ...prev, timer: message.data.timer } : null);
        break;
      case 'timer_expired':
        setGame(prev => prev ? { ...prev, gameState: 'waiting' } : null);
        if (!answerSubmitted) {
          toast({
            title: 'Time\'s up!',
            description: 'You didn\'t answer in time',
            variant: 'destructive',
          });
        }
        break;
      case 'answer_submitted':
        setAnswerSubmitted(true);
        setAnswerTime(message.data.timeToAnswer);
        break;
      case 'question_scored':
        setLeaderboard(message.data.leaderboard);
        setGame(prev => prev ? { ...prev, gameState: 'scoring' } : null);
        
        // Update player's score
        const updatedPlayer = message.data.leaderboard.find((p: Player) => p.id === player?.id);
        if (updatedPlayer) {
          setPlayer(updatedPlayer);
        }
        break;
      case 'game_ended':
        setLeaderboard(message.data.leaderboard);
        setGame(prev => prev ? { ...prev, gameState: 'finished' } : null);
        break;
      case 'error':
        toast({
          title: 'Error',
          description: message.message,
          variant: 'destructive',
        });
        break;
    }
  };

  const submitAnswer = (answer: string) => {
    if (!game || game.gameState !== 'active' || answerSubmitted || !questionStartTime) {
      return;
    }

    const timeToAnswer = Date.now() - questionStartTime;
    setSelectedAnswer(answer);
    
    sendMessage({
      type: 'submit_answer',
      data: { answer, timeToAnswer }
    });
  };

  if (!game || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-quiz-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Joining game...</p>
        </div>
      </div>
    );
  }

  // Game finished screen
  if (game.gameState === 'finished') {
    const playerRank = leaderboard.findIndex(p => p.id === player.id) + 1;
    const winner = leaderboard[0];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-lg border border-slate-200">
          <div className="bg-gradient-to-r from-quiz-secondary to-emerald-600 px-6 py-8 text-center">
            <Trophy className="w-12 h-12 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
            <p className="text-emerald-100">Great job! Here are the final results.</p>
          </div>
          
          <CardContent className="p-6">
            {/* Winner Spotlight */}
            <div className="bg-gradient-to-r from-quiz-accent to-yellow-500 rounded-lg p-6 mb-6 text-center">
              <Award className="w-8 h-8 text-white mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white mb-2">🏆 Winner</h3>
              <div className="text-2xl font-bold text-white">{winner.name}</div>
              <div className="text-lg text-yellow-100">{winner.totalScore} points</div>
            </div>
            
            {/* Your Result */}
            <div className="bg-slate-50 rounded-lg p-6 mb-6 text-center">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Your Result</h3>
              <div className="text-3xl font-bold text-quiz-primary mb-1">#{playerRank}</div>
              <div className="text-xl font-semibold text-slate-700">{player.totalScore} points</div>
            </div>
            
            {/* Top 3 Leaderboard */}
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-800 mb-3">Final Leaderboard</h4>
              {leaderboard.slice(0, 5).map((p, index) => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  p.id === player.id ? 'bg-quiz-primary/10 border-2 border-quiz-primary' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-quiz-accent' : 
                      index === 1 ? 'bg-slate-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{p.name}</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-quiz-primary">{p.totalScore}</div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <Button 
                onClick={() => setLocation('/')}
                className="bg-quiz-primary hover:bg-quiz-primary/90"
              >
                Play Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Waiting/Scoring screen
  if (game.gameState === 'waiting' || game.gameState === 'scoring') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border border-slate-200">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-quiz-accent rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {game.gameState === 'scoring' ? 'Scoring Results' : 'Waiting for Next Question'}
              </h2>
              <p className="text-slate-600">
                {game.gameState === 'scoring' 
                  ? 'The host is calculating scores...'
                  : 'The host will start the next question soon'
                }
              </p>
            </div>
            
            {answerSubmitted && selectedAnswer && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-2">Your Answer</div>
                  <div className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Answer {selectedAnswer}
                  </div>
                </div>
                
                {answerTime && (
                  <div className="text-sm text-slate-500">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Answered in {(answerTime / 1000).toFixed(1)} seconds
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-6 text-center">
              <div className="inline-flex items-center bg-slate-100 rounded-full px-4 py-2">
                <Users className="w-4 h-4 text-quiz-primary mr-2" />
                <span className="font-medium text-slate-800">{player.name}</span>
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Score: {player.totalScore} points
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active question screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg border border-slate-200">
        <CardContent className="p-8">
          {/* Timer Display */}
          <div className="text-center mb-8">
            <Timer 
              initialTime={game.timer} 
              isActive={game.gameState === 'active'} 
              className="mb-4"
            />
            <div className="text-lg font-semibold text-slate-800">
              Question {game.currentQuestion} of {game.totalQuestions}
            </div>
            <div className="text-sm text-slate-600">Choose your answer</div>
          </div>
          
          {/* Answer Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['A', 'B', 'C', 'D'].map((letter, index) => {
              const colors = [
                'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
                'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
                'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              ];
              
              const isSelected = selectedAnswer === letter;
              const isDisabled = answerSubmitted || game.gameState !== 'active';
              
              return (
                <Button
                  key={letter}
                  onClick={() => submitAnswer(letter)}
                  disabled={isDisabled}
                  className={`
                    h-20 text-xl font-bold transition-all duration-200 transform hover:scale-105
                    ${isSelected 
                      ? 'bg-slate-600 hover:bg-slate-700 ring-4 ring-slate-300' 
                      : `bg-gradient-to-r ${colors[index]}`
                    }
                    ${isDisabled ? 'opacity-50 cursor-not-allowed transform-none' : ''}
                  `}
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-1">{letter}</div>
                    <div className="text-sm opacity-90">
                      {isSelected ? 'Selected' : `Answer ${letter}`}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
          
          {/* Player Status */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center bg-slate-100 rounded-full px-4 py-2">
              <Users className="w-4 h-4 text-quiz-primary mr-2" />
              <span className="font-medium text-slate-800">{player.name}</span>
            </div>
            <div className="mt-2 text-sm text-slate-600">
              Score: {player.totalScore} points
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
