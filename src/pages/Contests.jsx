import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listContests } from '../services/contestService.js';
import useContestData from '../hooks/useContestData.js';
import useContestClock from '../hooks/useContestClock.js';
import { contestPhase } from '../utils/contest.js';
import Icon from '../components/Icon.jsx';
import '../components/hsg-admin/HsgAdmin.css';

/**
 * Trang "Đấu trường HSG"
 * Bám sát tuyệt đối hệ thống thiết kế Framer của Quản lý bài tập, Quản lý contest & Bảng vàng:
 * - Banner gradient navy -> blue
 * - Thanh tab chuyển nội dung (Đang diễn ra, Sắp diễn ra, Đã kết thúc) kèm số lượng
 * - Khung nội dung nền trắng, viền mảnh, bo góc 16-20px
 * - Trạng thái rỗng riêng biệt cho từng tab, không kéo dài hay lặp lại
 * - Khi có dữ liệu: Thẻ contest trực quan với nút hành động "Vào thi", "Xem chi tiết", "Xem kết quả"
 */

const EMPTY_MESSAGES = {
  running: {
    title: 'Chưa có contest đang diễn ra',
    desc: 'Các kỳ thi đang mở sẽ xuất hiện tại đây.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  upcoming: {
    title: 'Chưa có contest sắp diễn ra',
    desc: 'Lịch thi mới sẽ được cập nhật tại đây.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  ended: {
    title: 'Chưa có contest đã kết thúc',
    desc: 'Bạn có thể xem lại các kỳ thi đã hoàn thành tại đây.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
};

function formatContestDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Contests() {
  const state = useContestData(listContests, { poll: 15000 });
  const { now } = useContestClock();
  const [activeTab, setActiveTab] = useState('running'); // 'running' | 'upcoming' | 'ended'

  const allContests = state.value || [];

  // Lọc chỉ các kỳ thi đã xuất bản cho học sinh
  const publishedContests = useMemo(() => {
    return allContests.filter((c) => c.status === 'published');
  }, [allContests]);

  const runningContests = useMemo(() => {
    return publishedContests
      .filter((c) => contestPhase(c, now) === 'running')
      .sort((a, b) => b.startAt - a.startAt);
  }, [publishedContests, now]);

  const upcomingContests = useMemo(() => {
    return publishedContests
      .filter((c) => contestPhase(c, now) === 'upcoming')
      .sort((a, b) => a.startAt - b.startAt);
  }, [publishedContests, now]);

  const endedContests = useMemo(() => {
    return publishedContests
      .filter((c) => contestPhase(c, now) === 'ended')
      .sort((a, b) => b.startAt - a.startAt);
  }, [publishedContests, now]);

  const currentList =
    activeTab === 'running'
      ? runningContests
      : activeTab === 'upcoming'
      ? upcomingContests
      : endedContests;

  const emptyState = EMPTY_MESSAGES[activeTab];

  return (
    <div className="content hsg-page">
      <div className="hsg-frame-inner">
        {/* ── 1. PHẦN GIỚI THIỆU (BANNER) ─────────────────────── */}
        <section className="hsg-contest-banner">
          <span className="hsg-banner-badge">CONTEST MODE</span>
          <h1 className="hsg-contest-banner-title">Đấu trường HSG</h1>
          <div className="hsg-contest-chips">
            <span className="hsg-contest-chip">
              <Icon name="target" /> Luyện thi tập trung
            </span>
            <span className="hsg-contest-chip">
              <Icon name="check" /> Chấm điểm từng phần
            </span>
            <span className="hsg-contest-chip">
              <Icon name="shield" /> Không có AI Tutor trong contest
            </span>
          </div>
        </section>

        {/* ── 2. KHU VỰC DANH SÁCH CONTEST & TABS ─────────────── */}
        <section className="hsg-contest-section">
          <div className="hsg-contest-tabs-wrap">
            <div className="hsg-contest-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'running'}
                className={`hsg-contest-tab ${activeTab === 'running' ? 'active' : ''}`}
                onClick={() => setActiveTab('running')}
              >
                <span>Đang diễn ra</span>
                <span className="hsg-contest-tab-count">{runningContests.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'upcoming'}
                className={`hsg-contest-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                <span>Sắp diễn ra</span>
                <span className="hsg-contest-tab-count">{upcomingContests.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ended'}
                className={`hsg-contest-tab ${activeTab === 'ended' ? 'active' : ''}`}
                onClick={() => setActiveTab('ended')}
              >
                <span>Đã kết thúc</span>
                <span className="hsg-contest-tab-count">{endedContests.length}</span>
              </button>
            </div>
          </div>

          {/* ── 3. KHUNG NỘI DUNG NỀN TRẮNG ───────────────────── */}
          <div className="hsg-contest-box">
            {state.error && (
              <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', color: '#b91c1c', marginBottom: '20px', fontSize: '13px' }}>
                {state.error}
              </div>
            )}

            {currentList.length > 0 ? (
              <div className="hsg-contest-grid">
                {currentList.map((c) => {
                  const phase = contestPhase(c, now);
                  const problemCount = c.problems?.length || 0;

                  return (
                    <article key={c.id} className="hsg-contest-card">
                      <div>
                        <div className="hsg-contest-card-top">
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              background:
                                phase === 'running'
                                  ? '#dcfce7'
                                  : phase === 'upcoming'
                                  ? '#e0e7ff'
                                  : '#f1f5f9',
                              color:
                                phase === 'running'
                                  ? '#15803d'
                                  : phase === 'upcoming'
                                  ? '#4338ca'
                                  : '#64748b',
                            }}
                          >
                            {phase === 'running'
                              ? '● Đang diễn ra'
                              : phase === 'upcoming'
                              ? '⏱️ Sắp diễn ra'
                              : '✓ Đã kết thúc'}
                          </span>
                        </div>

                        <h3 className="hsg-contest-card-title">{c.title}</h3>
                        {c.description && <p className="hsg-contest-card-desc">{c.description}</p>}
                      </div>

                      <div>
                        <div className="hsg-contest-card-meta">
                          <span>
                            <Icon name="calendar" /> {formatContestDate(c.startAt)}
                          </span>
                          <span>
                            <Icon name="clock" /> {c.durationMinutes} phút
                          </span>
                          <span>
                            <Icon name="code" /> {problemCount} bài
                          </span>
                        </div>

                        <div className="hsg-contest-card-actions">
                          {phase === 'running' ? (
                            <Link to={`/contest/${c.id}`} className="hsg-contest-action-btn primary">
                              Vào thi →
                            </Link>
                          ) : phase === 'upcoming' ? (
                            <Link to={`/contest/${c.id}`} className="hsg-contest-action-btn secondary">
                              Xem chi tiết
                            </Link>
                          ) : (
                            <Link to={`/contest/${c.id}`} className="hsg-contest-action-btn secondary">
                              Xem kết quả
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* Trạng thái chưa có dữ liệu chuẩn thiết kế */
              <div className="hsg-contest-empty">
                <div className="hsg-contest-empty-icon">{emptyState.icon}</div>
                <h3 className="hsg-contest-empty-title">{emptyState.title}</h3>
                <p className="hsg-contest-empty-desc">{emptyState.desc}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
