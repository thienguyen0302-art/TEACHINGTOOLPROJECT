import { useState } from "react";
import Icon from "./Icon";
import { ANNOUNCEMENT_TYPES, createAnnouncement, updateAnnouncement } from "../services/announcementService";
import "./CreateAnnouncementModal.css";

export default function CreateAnnouncementModal(props) {
  if (!props.isOpen) return null;
  return <AnnouncementForm key={props.editItem?.id ?? 'new'} {...props} />;
}

function AnnouncementForm({ onClose, currentUser, onCreated, onUpdated, editItem = null }) {
  const isEditing = Boolean(editItem);
  const [title, setTitle] = useState(editItem?.title || "");
  const [content, setContent] = useState(editItem?.content || "");
  const [type, setType] = useState(editItem?.type || "general");
  const [pinned, setPinned] = useState(Boolean(editItem?.pinned));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề thông báo.");
      return;
    }
    if (!content.trim()) {
      setError("Vui lòng nhập nội dung thông báo.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (isEditing) {
        await updateAnnouncement(editItem.id, {
          title,
          content,
          type,
          pinned,
        });
        onUpdated?.({
          ...editItem,
          title,
          content,
          type,
          pinned,
        });
      } else {
        const created = await createAnnouncement({
          title,
          content,
          type,
          pinned,
          authorName: currentUser?.displayName || "Giáo viên",
          authorUid: currentUser?.uid || "",
        });
        onCreated?.(created);
      }
      onClose();
    } catch (err) {
      setError(err.message || (isEditing ? "Không thể cập nhật thông báo." : "Không thể đăng thông báo. Vui lòng thử lại."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cam-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cam-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cam-header">
          <div>
            <span className="cam-kicker">QUẢN LÝ LỚP HỌC</span>
            <h2>{isEditing ? "Chỉnh sửa thông báo" : "Đăng thông báo cho học sinh"}</h2>
            <p>{isEditing ? "Cập nhật nội dung hiển thị tới toàn thể học sinh." : "Thông báo sẽ hiển thị trực tiếp trên thanh thông báo của tất cả học sinh."}</p>
          </div>
          <button
            type="button"
            className="cam-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <Icon name="x" />
          </button>
        </div>

        {error && <div className="cam-error-box">{error}</div>}

        <form onSubmit={handleSubmit} className="cam-form">
          <div className="cam-field">
            <label htmlFor="cam-title">
              Tiêu đề thông báo <em>*</em>
            </label>
            <input
              id="cam-title"
              type="text"
              placeholder="Ví dụ: Lịch thi thử HSG tuần này, Nhắc nhở ôn tập chuyên đề Mảng..."
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="cam-row">
            <div className="cam-field">
              <label htmlFor="cam-type">Phân loại thông báo</label>
              <select
                id="cam-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {Object.entries(ANNOUNCEMENT_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.badge} — {val.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="cam-field cam-checkbox-field">
              <label className="cam-checkbox-label">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                />
                <span>Ghim thông báo lên đầu</span>
              </label>
            </div>
          </div>

          <div className="cam-field">
            <label htmlFor="cam-content">
              Nội dung thông báo <em>*</em>
            </label>
            <textarea
              id="cam-content"
              rows={5}
              placeholder="Nhập nội dung dặn dò, hướng dẫn, đường link bài tập hoặc dặn dò thời gian làm bài..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div className="cam-actions">
            <button
              type="button"
              className="cam-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="cam-btn-submit"
              disabled={loading}
            >
              <Icon name={isEditing ? "check" : "megaphone"} />
              <span>{loading ? (isEditing ? "Đang lưu..." : "Đang đăng...") : (isEditing ? "Lưu thay đổi" : "Đăng thông báo")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
