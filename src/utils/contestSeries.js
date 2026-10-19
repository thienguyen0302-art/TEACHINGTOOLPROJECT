import { timestampMs } from './contest.js';
export const isKienGiangSeries = contest => /^kien-giang-hsg-20\d{2}-20\d{2}$/.test(contest.id ?? '');
export function nextSeriesContest(contests, now) {
  return contests.filter(c=>isKienGiangSeries(c)&&c.status==='published'&&timestampMs(c.startAt)>now).sort((a,b)=>timestampMs(a.startAt)-timestampMs(b.startAt))[0] ?? null;
}
export function seriesCountdown(ms) {
  const seconds=Math.floor(Math.max(0,ms)/1000);
  return `${Math.floor(seconds/86400)} ngày ${[Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':')}`;
}
