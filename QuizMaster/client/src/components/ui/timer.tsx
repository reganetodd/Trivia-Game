import { useEffect, useState } from 'react';

interface TimerProps {
  initialTime: number;
  onTimeUp?: () => void;
  isActive?: boolean;
  className?: string;
}

export function Timer({ initialTime, onTimeUp, isActive = false, className = '' }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeUp]);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = ((initialTime - timeLeft) / initialTime) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="hsl(220, 13%, 91%)"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="hsl(43, 96%, 56%)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-quiz-accent">{timeLeft}</span>
      </div>
    </div>
  );
}
