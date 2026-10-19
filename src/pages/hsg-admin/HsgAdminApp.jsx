import { useState, useEffect } from 'react';
import { PageShell } from '../../components/hsg-admin/HsgAdminUI';
import ManageProblemsPage from './ManageProblemsPage';
import HonorContestPage from './HonorContestPage';
import ManageContestsPage from './ManageContestsPage';

const TABS = [
  { id: 'problems', label: 'Quản lý bài tập' },
  { id: 'ranking', label: 'Bảng vàng contest HSG toàn trường' },
  { id: 'contests', label: 'Quản lý contest' },
];

export default function HsgAdminApp({ initialTab = 'problems', showSwitcher = true }) {
  const [activeTab, setActiveTab] = useState(() => {
    // Ưu tiên đọc từ URL hash hoặc search param
    const hash = window.location.hash.replace('#', '');
    if (TABS.some((t) => t.id === hash)) return hash;
    const params = new URLSearchParams(window.location.search);
    const view = params.get('tab') || params.get('view');
    if (TABS.some((t) => t.id === view)) return view;
    return initialTab;
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (TABS.some((t) => t.id === hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    window.location.assign(`#${tabId}`);
  };

  return (
    <PageShell>
      {showSwitcher && (
        <div className="hsg-nav-switcher" role="navigation" aria-label="Chuyển trang quản trị HSG">
          <div className="hsg-nav-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`hsg-nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => handleSelectTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
            HSG Admin UI · Framer Spec
          </span>
        </div>
      )}

      {activeTab === 'problems' && <ManageProblemsPage />}
      {activeTab === 'ranking' && <HonorContestPage />}
      {activeTab === 'contests' && <ManageContestsPage />}
    </PageShell>
  );
}
