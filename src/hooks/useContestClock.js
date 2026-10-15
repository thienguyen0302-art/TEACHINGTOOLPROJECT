import { useEffect, useState } from 'react';
import { contestPhase, remainingMs } from '../utils/contest.js';
export default function useContestClock(contest) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return { now, phase: contest ? contestPhase(contest, now) : null, remaining: contest ? remainingMs(contest, now) : 0 };
}
