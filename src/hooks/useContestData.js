import { useEffect, useState } from 'react';
// Callers use stable service functions or useCallback when arguments change.
export default function useContestData(loader, { poll = 0 } = {}) {
  const [state, setState] = useState({ loading: true, value: null, error: '' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () => loader().then((value) => { if (active) setState({ loading: false, value, error: '' }); })
      .catch((error) => { if (active) setState((previous) => ({ ...previous, loading: false, error: error.message })); });
    load();
    const interval = poll ? setInterval(load, poll) : null;
    return () => { active = false; if (interval) clearInterval(interval); };
  }, [loader, poll, version]);
  return { ...state, refresh: () => setVersion((v) => v + 1) };
}
