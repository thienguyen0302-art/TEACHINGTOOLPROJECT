import { useEffect, useState } from 'react';
// Callers use stable service functions or useCallback when arguments change.
export default function useContestData(loader, { poll = 0 } = {}) {
  const [state, setState] = useState({ loader, loading: true, value: null, error: '' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () => loader().then((value) => { if (active) setState({ loader, loading: false, value, error: '' }); })
      .catch((error) => { if (active) setState((previous) => ({ loader, value: previous.loader === loader ? previous.value : null, loading: false, error: error.message })); });
    load();
    const interval = poll ? setInterval(load, poll) : null;
    return () => { active = false; if (interval) clearInterval(interval); };
  }, [loader, poll, version]);
  const current = state.loader === loader ? state : { loading: true, value: null, error: '' };
  return { ...current, refresh: () => setVersion((v) => v + 1) };
}
