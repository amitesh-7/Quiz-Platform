import {useState, useEffect, useRef} from 'react';

interface UseTimerOptions {
  duration: number; // in minutes
  onTimeUp?: () => void;
}

interface UseTimerReturn {
  timeLeft: number; // in seconds
  isRunning: boolean;
  formattedTime: string;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export function useTimer({duration, onTimeUp}: UseTimerOptions): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            onTimeUp?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, onTimeUp]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const reset = () => {
    setIsRunning(false);
    setTimeLeft(duration * 60);
  };

  return {
    timeLeft,
    isRunning,
    formattedTime: formatTime(timeLeft),
    start,
    pause,
    reset,
  };
}
