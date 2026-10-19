import './HsgAdmin.css';
import { PlusIcon, UploadIcon, DownloadIcon, TrophyOutlineIcon } from './HsgIcons';

/**
 * Khung trang chuẩn 1200px với 48px lề hai bên (nội dung rộng tối đa 1104px)
 */
export function PageShell({ children, className = '' }) {
  return (
    <div className="hsg-root">
      <main className={`hsg-frame ${className}`}>
        {children}
      </main>
    </div>
  );
}

/**
 * Tiêu đề trang + Mô tả phụ
 */
export function PageHeader({ title, description, actions, children }) {
  return (
    <header className="hsg-page-header">
      <div className="hsg-header-text">
        <h1 className="hsg-page-title">{title}</h1>
        {description && <p className="hsg-page-desc">{description}</p>}
      </div>
      {(actions || children) && (
        <div className="hsg-btn-group">
          {actions}
          {children}
        </div>
      )}
    </header>
  );
}

/**
 * Nút bấm chuẩn thiết kế
 * - variant: "primary" (xanh dương) | "secondary" (nền trắng viền mảnh)
 */
export function AdminButton({
  variant = 'secondary',
  icon,
  children,
  onClick,
  as: Component = 'button',
  ...rest
}) {
  return (
    <Component
      className={`hsg-btn hsg-btn-${variant}`}
      onClick={onClick}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </Component>
  );
}

/**
 * Thẻ chứa bảng bo góc, nền trắng, hỗ trợ cuộn ngang trên thiết bị nhỏ
 */
export function TableCard({ headers = [], children, emptyTitle, emptyDesc }) {
  return (
    <div className="hsg-table-card">
      <div className="hsg-table-wrapper">
        <table className="hsg-table">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {children || (
              <tr>
                <td colSpan={headers.length || 1} className="hsg-empty-state">
                  <div className="hsg-empty-title">{emptyTitle}</div>
                  {emptyDesc && <div className="hsg-empty-desc">{emptyDesc}</div>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Banner ngang bo góc chuyển sắc xanh navy sang xanh dương
 */
export function HonorBanner({ badge, title, description }) {
  return (
    <section className="hsg-banner">
      {badge && <span className="hsg-banner-badge">{badge}</span>}
      <h1 className="hsg-banner-title">{title}</h1>
      {description && <p className="hsg-banner-desc">{description}</p>}
    </section>
  );
}

/**
 * Thẻ vinh danh (Hạng 1, Hạng 2, Hạng 3)
 */
export function HonorCard({
  rank = 1,
  rankLabel,
  title = "Chờ vinh danh",
  subtitle = "Chưa có kết quả"
}) {
  const rankClass = `rank-${rank}`;
  const defaultLabel = `Hạng ${rank}`;

  return (
    <div className={`hsg-honor-card ${rankClass}`}>
      <div className="hsg-card-cup">
        <TrophyOutlineIcon size={rank === 1 ? 48 : 42} />
      </div>
      <div className="hsg-card-rank-tag">{rankLabel || defaultLabel}</div>
      <div className="hsg-card-title">{title}</div>
      <div className="hsg-card-desc">{subtitle}</div>
    </div>
  );
}

/**
 * Bố cục bục vinh danh ba thẻ: Hạng 2 (Trái) - Hạng 1 (Giữa, cao hơn) - Hạng 3 (Phải)
 */
export function HonorPodium({ children }) {
  return <div className="hsg-podium-grid">{children}</div>;
}

/**
 * Ghi chú và thông báo ở cuối trang bảng vàng
 */
export function HonorFooter({
  mainText = "Chưa có kết quả xếp hạng. Ba vị trí vinh danh sẽ được cập nhật khi có bài thi hợp lệ.",
  noteText = "BẢN XEM TRƯỚC · Chưa kết nối dữ liệu thi thực tế."
}) {
  return (
    <footer className="hsg-ranking-footer">
      <p className="hsg-ranking-footer-main">{mainText}</p>
      {noteText && <p className="hsg-ranking-footer-note">{noteText}</p>}
    </footer>
  );
}

export { PlusIcon, UploadIcon, DownloadIcon, TrophyOutlineIcon };
