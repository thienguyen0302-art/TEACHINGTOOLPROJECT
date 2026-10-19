import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import {
  subscribeGoals,
  saveGoal,
  toggleGoalCompleted,
  deleteGoal,
  getDueGoals,
} from '../services/goalService';
import './QuickGoalModal.css';

function formatDateBadge(dateStr) {
  if (!dateStr) return { text: 'Không thời hạn', cls: '' };
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return { text: 'Hôm nay', cls: 'today' };
  if (dateStr < today) return { text: 'Quá hạn', cls: 'overdue' };
  const [, m, d] = dateStr.split('-');
  return { text: `${d}/${m}`, cls: '' };
}

export default function QuickGoalModal({ isOpen, onClose, user }) {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [tab, setTab] = useState('active'); // 'active' | 'all' | 'completed'
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('practice');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeGoals(user?.uid, (list) => {
      setGoals(list || []);
    });
    return () => unsub?.();
  }, [isOpen, user?.uid]);

  // Đóng modal khi bấm Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const dueGoals = useMemo(() => getDueGoals(goals), [goals]);

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      if (tab === 'active') return !g.completed;
      if (tab === 'completed') return g.completed;
      return true;
    });
  }, [goals, tab]);

  const activeCount = goals.filter((g) => !g.completed).length;

  async function handleToggle(goal) {
    const nextVal = !goal.completed;
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, completed: nextVal } : g))
    );
    await toggleGoalCompleted(user?.uid, goal.id, nextVal);
  }

  async function handleDelete(goalId) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    await deleteGoal(user?.uid, goalId);
  }

  async function handleQuickAdd(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const saved = await saveGoal(user?.uid, {
        title: newTitle.trim(),
        targetType: newType,
        targetDate: newDate,
      });
      setGoals((prev) => [saved, ...prev]);
      setNewTitle('');
      setShowAddForm(false);
      if (tab === 'completed') setTab('active');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="qg-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="qg-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="qg-header">
          <div className="qg-header-title">
            <h3>
              <Icon name="target" /> Mục tiêu học tập
            </h3>
            <span className="qg-kbd-badge">Phím tắt: G</span>
          </div>
          <button className="qg-close-btn" onClick={onClose} aria-label="Đóng" title="Đóng cửa sổ">
            <Icon name="x" />
          </button>
        </div>

        {/* Body */}
        <div className="qg-body">
          {dueGoals.length > 0 && (
            <div className="qg-reminder-banner">
              <span>🔔 Bạn có <strong>{dueGoals.length} mục tiêu</strong> đến hạn hoặc quá hạn hôm nay!</span>
            </div>
          )}

          {/* Tabs */}
          <div className="qg-tabs">
            <button
              type="button"
              className={`qg-tab-btn ${tab === 'active' ? 'active' : ''}`}
              onClick={() => setTab('active')}
            >
              Đang thực hiện ({activeCount})
            </button>
            <button
              type="button"
              className={`qg-tab-btn ${tab === 'completed' ? 'active' : ''}`}
              onClick={() => setTab('completed')}
            >
              Đã xong ({goals.length - activeCount})
            </button>
            <button
              type="button"
              className={`qg-tab-btn ${tab === 'all' ? 'active' : ''}`}
              onClick={() => setTab('all')}
            >
              Tất cả ({goals.length})
            </button>
          </div>

          {/* Goal List */}
          <div className="qg-list">
            {filteredGoals.map((g) => {
              const badge = formatDateBadge(g.targetDate);
              return (
                <div key={g.id} className={`qg-item ${g.completed ? 'completed' : ''}`}>
                  <input
                    type="checkbox"
                    className="qg-checkbox"
                    checked={g.completed}
                    onChange={() => handleToggle(g)}
                    title={g.completed ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
                  />
                  <div className="qg-item-content">
                    <h4 className="qg-item-title">{g.title}</h4>
                    <div className="qg-item-meta">
                      <span className={`qg-badge-date ${badge.cls}`}>
                        📅 {badge.text}
                      </span>
                      {g.notes && <span className="qg-item-note">“{g.notes}”</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="qg-item-delete"
                    onClick={() => handleDelete(g.id)}
                    title="Xóa mục tiêu"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              );
            })}

            {filteredGoals.length === 0 && (
              <div className="qg-empty">
                <p>
                  {tab === 'completed'
                    ? 'Chưa có mục tiêu nào hoàn thành.'
                    : 'Hiện không có mục tiêu nào đang thực hiện.'}
                </p>
                <small>Bấm nút bên dưới để thêm mục tiêu học tập mới!</small>
              </div>
            )}
          </div>

          {/* Quick Add Form toggle */}
          {showAddForm ? (
            <form className="qg-quick-form" onSubmit={handleQuickAdd}>
              <div className="qg-form-title">Tạo nhanh mục tiêu mới</div>
              <div className="qg-form-row">
                <input
                  type="text"
                  className="qg-input"
                  placeholder="Tên mục tiêu (ví dụ: Giải 3 bài tập Quy hoạch động)..."
                  value={newTitle}
                  autoFocus
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="qg-form-row qg-form-actions-row">
                <select
                  className="qg-select"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="practice">Bài tập</option>
                  <option value="exam">Đề thi HSG</option>
                  <option value="theory">Lý thuyết</option>
                  <option value="time">Thời gian học</option>
                </select>
                <input
                  type="date"
                  className="qg-input qg-date-input"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
                <button
                  type="submit"
                  className="qg-btn-submit"
                  disabled={saving || !newTitle.trim()}
                >
                  {saving ? 'Đang lưu…' : 'Lưu'}
                </button>
                <button
                  type="button"
                  className="qg-btn-cancel"
                  onClick={() => setShowAddForm(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="qg-add-btn"
              onClick={() => setShowAddForm(true)}
            >
              + Thêm mục tiêu mới
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="qg-footer">
          <button
            type="button"
            className="qg-calendar-link"
            onClick={() => {
              onClose();
              navigate('/calendar');
            }}
          >
            Mở trang Lịch học &amp; Mục tiêu chi tiết →
          </button>
          <span className="qg-esc-hint">
            Nhấn <kbd>Esc</kbd> để đóng
          </span>
        </div>
      </div>
    </div>
  );
}
