import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TeacherProblems, { TeacherProblemEditor } from '../../src/pages/TeacherProblems.jsx';
import TeacherContests, { TeacherContestEditor } from '../../src/pages/TeacherContests.jsx';
import '../../src/index.css';
import '../../src/styles/dashboard.css';
createRoot(document.getElementById('root')).render(<BrowserRouter><main style={{maxWidth:1240,margin:'auto',padding:16}}><Routes><Route path="/teacher/problems/new" element={<TeacherProblemEditor/>}/><Route path="/teacher/problems/:problemId/edit" element={<TeacherProblemEditor/>}/><Route path="/teacher/contests/:contestId/edit" element={<TeacherContestEditor/>}/><Route path="/teacher/contests/new" element={<TeacherContestEditor/>}/><Route path="/teacher/contests" element={<TeacherContests/>}/><Route path="*" element={<TeacherProblems/>}/></Routes></main></BrowserRouter>);
