import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import AppShell from '../../src/components/AppShell.jsx';
import SubmissionHistory from '../../src/pages/SubmissionHistory.jsx';
import '../../src/index.css';
import '../../src/styles/dashboard.css';
createRoot(document.getElementById('root')).render(<BrowserRouter><AppShell user={{uid:'fixture',displayName:'Học sinh mẫu'}} onLogout={()=>{}}><SubmissionHistory/></AppShell></BrowserRouter>);
