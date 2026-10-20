import { useEffect, useState } from 'react';
// Callers use stable service functions or useCallback when arguments change.
export default function useContestData(loader, { poll = 0 } = {}) {
  const [state, setState] = useState({ loader, loading: true, value: null, error: '' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const value = await loader();
        if (active) setState({ loader, loading: false, value, error: '' });
      } catch (error) {
        if (active) setState((previous) => ({ loader, value: previous.loader === loader ? previous.value : null, loading: false, error: error.message }));
      } finally { pending = false; }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    load();
    const interval = poll ? setInterval(load, poll) : null;
    if (poll) {
      window.addEventListener('focus', onVisible);
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      active = false;
      if (interval) clearInterval(interval);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loader, poll, version]);
  const current = state.loader === loader ? state : { loading: true, value: null, error: '' };
  return { ...current, refresh: () => setVersion((v) => v + 1) };
}
