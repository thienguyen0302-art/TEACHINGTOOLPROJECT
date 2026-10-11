export default function TutorIcon({ name = 'spark', className = '' }) {
  const paths = {
    spark: 'M12 3c0 5-4 9-9 9 5 0 9 4 9 9 0-5 4-9 9-9-5 0-9-4-9-9Z',
    bug: 'M9 4l1 3m5-3-1 3M8 10h8v6a4 4 0 0 1-8 0v-6Zm-4 2h4m8 0h4M4 17h4m8 0h4M12 10v10',
    search: 'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    chart: 'M4 4v16h16M8 15l4-5 4 2 4-7',
    steps: 'M4 5h5v5H4V5Zm11 9h5v5h-5v-5ZM9 7h7v7',
    arrow: 'M12 19V5m-6 6 6-6 6 6',
    back: 'M14 6l-6 6 6 6', next: 'M10 6l6 6-6 6',
    play: 'm8 5 11 7-11 7V5Z', pause: 'M9 5v14M15 5v14', reset: 'M4 9a8 8 0 1 1 0 7M4 3v6h6',
  };
  return <svg className={className} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.spark} /></svg>;
}
