import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Link } from 'react-router-dom';
import AppShell from '../../src/components/AppShell.jsx';
import '../../src/index.css';
import '../../src/styles/dashboard.css';
export default function Fixture() {
  return <MemoryRouter><AppShell user={{uid:'fixture',displayName:'Học sinh'}} onLogout={()=>{}}><div className="content"><h1>Trang kiểm thử</h1><Link to="/curriculum">Chương trình</Link> <Link to="/practice">Bài tập</Link> <Link to="/contest/example/problem/a">Vào Contest</Link> <Link to="/">Dashboard</Link></div></AppShell></MemoryRouter>;
}
createRoot(document.getElementById('root')).render(<StrictMode><Fixture /></StrictMode>);
