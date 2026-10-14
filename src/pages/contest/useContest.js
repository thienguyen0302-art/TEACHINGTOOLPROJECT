import { useCallback, useEffect, useState } from "react";
import {
  getContest,
  getContestSubmissions,
  getScoreboard,
} from "../../services/contestService";
export default function useContest(id, user, teacher) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    contest: null,
    submissions: [],
    scoreboard: [],
  });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    let live = true;
    Promise.all([
      getContest(id),
      getContestSubmissions(id, user.uid, teacher),
      getScoreboard(id),
    ])
      .then(([contest, submissions, scoreboard]) => {
        if (!contest) throw new Error("Không tìm thấy contest.");
        if (live)
          setState({
            loading: false,
            error: "",
            contest,
            submissions,
            scoreboard,
          });
      })
      .catch((e) => {
        if (live) setState((p) => ({ ...p, loading: false, error: e.message }));
      });
    return () => {
      live = false;
    };
  }, [id, user.uid, teacher, revision]);
  return { ...state, reload };
}
