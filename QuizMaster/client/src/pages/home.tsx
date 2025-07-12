import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Brain, Crown, Users } from 'lucide-react';

export default function Home() {
  const [, setLocation] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const { toast } = useToast();

  const createGame = async () => {
    setIsCreating(true);
    try {
      const response = await apiRequest('POST', '/api/games', {
        hostId: `host-${Date.now()}`,
      });
      const data = await response.json();
      
      setLocation(`/host?roomCode=${data.roomCode}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create game',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const joinGame = () => {
    if (!roomCode.trim() || !playerName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter both room code and your name',
        variant: 'destructive',
      });
      return;
    }

    setLocation(`/player?roomCode=${roomCode}&name=${encodeURIComponent(playerName)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Brain className="w-12 h-12 text-quiz-primary mr-3" />
            <h1 className="text-4xl font-bold text-slate-800">Koopan</h1>
          </div>
          <p className="text-xl text-slate-600">Real-time multiplayer quiz game</p>
        </div>

        {/* Main Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Host a Game */}
          <Card className="border-2 border-quiz-primary/20 hover:border-quiz-primary/40 transition-colors">
            <CardContent className="p-8 text-center">
              <Crown className="w-16 h-16 text-quiz-accent mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Host a Game</h2>
              <p className="text-slate-600 mb-6">
                Create and control your own quiz game. Perfect for classrooms, events, or fun with friends.
              </p>
              <Button 
                onClick={createGame}
                disabled={isCreating}
                className="w-full bg-quiz-primary hover:bg-quiz-primary/90"
                size="lg"
              >
                {isCreating ? 'Creating...' : 'Create Game'}
              </Button>
            </CardContent>
          </Card>

          {/* Join a Game */}
          <Card className="border-2 border-quiz-secondary/20 hover:border-quiz-secondary/40 transition-colors">
            <CardContent className="p-8 text-center">
              <Users className="w-16 h-16 text-quiz-secondary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Join a Game</h2>
              <p className="text-slate-600 mb-6">
                Enter a room code to join an existing game and compete with other players.
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="roomCode" className="text-left block text-sm font-medium text-slate-700 mb-2">
                    Room Code
                  </Label>
                  <Input
                    id="roomCode"
                    placeholder="e.g., QZ-ABCD"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="text-center font-mono"
                  />
                </div>
                
                <div>
                  <Label htmlFor="playerName" className="text-left block text-sm font-medium text-slate-700 mb-2">
                    Your Name
                  </Label>
                  <Input
                    id="playerName"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={joinGame}
                  className="w-full bg-quiz-secondary hover:bg-quiz-secondary/90"
                  size="lg"
                >
                  Join Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-quiz-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-quiz-primary font-bold">⚡</span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Speed-Based Scoring</h3>
            <p className="text-sm text-slate-600">Faster correct answers earn more points</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-quiz-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-quiz-secondary font-bold">📱</span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Mobile Friendly</h3>
            <p className="text-sm text-slate-600">Play on any device, anywhere</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-quiz-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-quiz-accent font-bold">🏆</span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Live Leaderboard</h3>
            <p className="text-sm text-slate-600">Real-time ranking updates</p>
          </div>
        </div>
      </div>
    </div>
  );
}
