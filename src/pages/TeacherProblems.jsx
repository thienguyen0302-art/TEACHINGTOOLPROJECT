import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { listTeacherProblems, loadTeacherProblem, saveTeacherProblem } from '../services/contestService.js';
import useContestData from '../hooks/useContestData.js';
import useContestClock from '../hooks/useContestClock.js';
import { parseProblemImport, problemTemplate, serializePublicProblem, validateProblem } from '../utils/problemAuthoring.js';
import ProblemStatement from '../components/ProblemStatement.jsx';
import { ContestError } from '../components/ContestUI.jsx';
import { PlusIcon, UploadIcon, DownloadIcon } from '../components/hsg-admin/HsgIcons.jsx';
import '../components/hsg-admin/HsgAdmin.css';
import './ProblemBank.css';
import './Contest.css';

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(problemTemplate, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'problem-template.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TeacherProblems() {
  const state = useContestData(listTeacherProblems);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function importFile(event) {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('JSON import tối đa 2 MB.');
      const imported = parseProblemImport(await file.text());
      navigate('/teacher/problems/new', { state: { imported } });
    } catch (e) { setError(e.message); event.target.value = ''; }
  }

  return (
    <div className="content hsg-page">
      <div className="hsg-frame-inner">
        <header className="hsg-page-header">
        <div className="hsg-header-text">
          <h1 className="hsg-page-title">Quản lý bài tập</h1>
          <p className="hsg-page-desc">Tạo, cập nhật và quản lý ngân hàng bài tập của bạn.</p>
        </div>
        <div className="hsg-btn-group">
          <Link className="hsg-btn hsg-btn-primary" to="/teacher/problems/new">
            <PlusIcon size={16} />
            <span>Tạo bài mới</span>
          </Link>
          <label className="hsg-btn hsg-btn-secondary" style={{ cursor: 'pointer' }}>
            <UploadIcon size={16} />
            <span>Nhập JSON</span>
            <input aria-label="Import JSON" type="file" accept=".json,application/json" onChange={importFile} style={{ display: 'none' }} />
          </label>
          <button type="button" className="hsg-btn hsg-btn-secondary" onClick={downloadTemplate}>
            <DownloadIcon size={16} />
            <span>Tải mẫu JSON</span>
          </button>
        </div>
      </header>

      {error && <p role="alert" className="err" style={{ marginBottom: 16 }}>{error}</p>}

      {!state.value ? (
        <ContestError state={state} />
      ) : (
        <div className="hsg-table-card">
          <div className="hsg-table-wrapper">
            <table className="hsg-table">
              <thead>
                <tr>
                  <th>Tên bài tập</th>
                  <th>Độ khó / Chủ đề</th>
                  <th>Trạng thái</th>
                  <th>Test mẫu</th>
                  <th>Test ẩn</th>
                  <th>Cập nhật</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {state.value.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.title}</td>
                    <td>
                      {p.difficulty}
                      {p.tags?.length > 0 && <small style={{ display: 'block', color: 'var(--hsg-text-secondary)' }}>{p.tags.join(', ')}</small>}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: p.status === 'published' ? '#dcfce7' : '#f1f5f9',
                        color: p.status === 'published' ? '#166534' : '#475569'
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.samples?.length || 0}</td>
                    <td>{p.hiddenTestCount || 0}</td>
                    <td>{new Date(p.updatedAt).toLocaleString('vi-VN')}</td>
                    <td>
                      <Link to={`/teacher/problems/${p.id}/edit`} style={{ color: 'var(--hsg-blue-primary)', fontWeight: 600, textDecoration: 'none' }}>
                        Sửa
                      </Link>
                    </td>
                  </tr>
                ))}
                {!state.value.length && (
                  <tr>
                    <td colSpan={7} className="hsg-empty-state">
                      <div className="hsg-empty-title">Chưa có bài tập nào</div>
                      <div className="hsg-empty-desc">Tạo bài tập đầu tiên hoặc nhập dữ liệu từ tệp JSON.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
function ProblemForm({ initial, problemId }) {
  const [form, setForm] = useState(() => structuredClone(initial ?? problemTemplate));
  const [tagsText, setTagsText] = useState(initial?.tags.join(', ') ?? '');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { now } = useContestClock();
  const locked = (initial?.lockedUntil ?? 0) > now;
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const payload = { ...form, tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean) };
  const previewCurrent = preview?.signature === JSON.stringify(payload);

  function showPreview() {
    try {
      const validated = validateProblem(payload);
      setPreview({ signature: JSON.stringify(payload), problem: serializePublicProblem(validated) });
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  async function save(status) {
    try {
      if (status === 'published' && !previewCurrent) {
        throw new Error('Vui lòng bấm "Xem trước" nội dung hiện tại trước khi Xuất bản.');
      }
      const validated = validateProblem(payload, { status });
      setBusy(true);
      setError('');
      const { id } = await saveTeacherProblem(problemId, { ...validated, status });
      navigate(`/teacher/problems/${id}/edit`, { replace: true });
      if (id === problemId) navigate('/teacher/problems');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function updateTest(key, index, field, value) {
    change(key, form[key].map((test, i) => i === index ? { ...test, [field]: value } : test));
  }

  async function importFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Tệp JSON nhập tối đa 2 MB.');
      const imported = parseProblemImport(await file.text());
      setForm(imported);
      setTagsText(imported.tags.join(', '));
      setPreview(null);
      setError('');
    } catch (e) {
      setError(e.message);
    }
    event.target.value = '';
  }

  const sectionFields = [
    ['statement', 'Mô tả bài toán (Đề bài)', 6],
    ['inputDescription', 'Quy cách dữ liệu vào (Input)', 3],
    ['outputDescription', 'Quy cách dữ liệu ra (Output)', 3]
  ];

  return (
    <>
      <header className="hsg-page-header" style={{ marginBottom: 20 }}>
        <div className="hsg-header-text">
          <h1 className="hsg-page-title">{problemId ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}</h1>
          <p className="hsg-page-desc">
            Trạng thái: <strong>{initial?.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</strong>. Nhập JSON chỉ điền biểu mẫu, không tự lưu hoặc xuất bản.
          </p>
        </div>
        <div className="hsg-btn-group">
          <button type="button" className="hsg-btn hsg-btn-secondary" onClick={downloadTemplate}>
            <DownloadIcon size={16} />
            <span>Tải mẫu JSON</span>
          </button>
        </div>
      </header>

      {locked && (
        <p role="status" className="contest-warning" style={{ marginBottom: 16 }}>
          Bài tập này đã thuộc contest đã xuất bản, đang khóa nội dung và test ẩn đến {new Date(initial.lockedUntil).toLocaleString('vi-VN')}.
        </p>
      )}

      <form className="contest-form" onSubmit={(e) => e.preventDefault()}>
        {/* Thông tin cơ bản */}
        <fieldset disabled={busy || locked}>
          <legend>Thông tin cơ bản</legend>
          <label>
            Nhập dữ liệu từ tệp JSON
            <input type="file" accept=".json,application/json" onChange={importFile} />
          </label>
          <label>
            Tên bài tập
            <input
              value={form.title}
              maxLength={300}
              placeholder="Ví dụ: Tính tổng hai số nguyên"
              onChange={(e) => change('title', e.target.value)}
            />
          </label>
          <label>
            Đường dẫn định danh (Slug)
            <input
              value={form.slug}
              placeholder="vi-du-tinh-tong-hai-so"
              onChange={(e) => change('slug', e.target.value)}
            />
          </label>
          <label>
            Độ khó
            <select value={form.difficulty} onChange={(e) => change('difficulty', e.target.value)}>
              <option value="basic">Cơ bản</option>
              <option value="intermediate">Trung bình</option>
              <option value="advanced">Nâng cao</option>
            </select>
          </label>
          <label>
            Chủ đề / Thẻ phân loại (cách nhau bằng dấu phẩy)
            <input
              value={tagsText}
              placeholder="toán học, mảng, quy hoạch động"
              onChange={(e) => setTagsText(e.target.value)}
            />
          </label>
        </fieldset>

        {/* Nội dung đề bài */}
        <fieldset disabled={busy || locked}>
          <legend>Nội dung đề bài</legend>
          {sectionFields.map(([key, label, rows]) => (
            <label key={key}>
              {label}
              <textarea
                rows={rows}
                value={form[key]}
                onChange={(e) => change(key, e.target.value)}
              />
            </label>
          ))}
          <label>
            Ràng buộc & Giới hạn (mỗi dòng một ràng buộc)
            <textarea
              rows={4}
              placeholder={"1 ≤ N ≤ 10^5\n|A[i]| ≤ 10^9"}
              value={form.constraints.join('\n')}
              onChange={(e) => change('constraints', e.target.value.split('\n'))}
            />
          </label>
        </fieldset>

        {/* Bộ test kiểm thử */}
        {[
          ['samples', 'Test mẫu (Ví dụ đề bài)', 10],
          ['hiddenTests', 'Test ẩn chấm điểm', 50]
        ].map(([key, label, max]) => (
          <fieldset disabled={busy || locked} key={key}>
            <legend>{label} ({form[key].length}/{max})</legend>
            {key === 'hiddenTests' && (
              <p className="contest-warning" style={{ margin: '0 0 12px 0' }}>
                Chỉ giáo viên và hệ thống chấm bài tự động mới có quyền xem.
              </p>
            )}
            {form[key].map((test, index) => (
              <div className="contest-test-editor" key={index}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px 0' }}>
                  {key === 'samples' ? 'Test mẫu' : 'Test ẩn'} {index + 1}
                </h3>
                <label>
                  Dữ liệu vào (Input) test {index + 1}
                  <textarea
                    rows={3}
                    value={test.input ?? ''}
                    onChange={(e) => updateTest(key, index, 'input', e.target.value)}
                  />
                </label>
                <label>
                  Kết quả ra (Output) test {index + 1}
                  <textarea
                    rows={3}
                    value={test.output ?? ''}
                    onChange={(e) => updateTest(key, index, 'output', e.target.value)}
                  />
                </label>
                {key === 'samples' && (
                  <label>
                    Giải thích test mẫu {index + 1} (Tùy chọn)
                    <textarea
                      rows={2}
                      value={test.explanation ?? ''}
                      onChange={(e) => updateTest(key, index, 'explanation', e.target.value)}
                    />
                  </label>
                )}
                <button
                  type="button"
                  className="hsg-btn hsg-btn-secondary"
                  style={{ height: 34, fontSize: 13, marginTop: 4 }}
                  onClick={() => change(key, form[key].filter((_, i) => i !== index))}
                >
                  Xóa test {index + 1}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="hsg-btn hsg-btn-secondary"
              style={{ height: 36, fontSize: 13, marginTop: 8 }}
              disabled={form[key].length >= max}
              onClick={() => change(key, [...form[key], { input: '', output: '', ...(key === 'samples' ? { explanation: '' } : {}) }])}
            >
              + Thêm {key === 'samples' ? 'test mẫu' : 'test ẩn'}
            </button>
          </fieldset>
        ))}

        {/* Ngôn ngữ và Starter code */}
        <fieldset disabled={busy || locked}>
          <legend>Ngôn ngữ hỗ trợ và mã khởi tạo (Starter code)</legend>
          {['cpp', 'python'].map((language) => (
            <div key={language} style={{ marginBottom: 16 }}>
              <label className="contest-checkbox" style={{ fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.allowedLanguages.includes(language)}
                  onChange={(e) => change('allowedLanguages', e.target.checked
                    ? [...form.allowedLanguages, language]
                    : form.allowedLanguages.filter((l) => l !== language)
                  )}
                />
                Cho phép nộp bài bằng {language === 'cpp' ? 'C++' : 'Python'}
              </label>
              <label style={{ marginTop: 6 }}>
                Mã nguồn khởi tạo ({language === 'cpp' ? 'C++' : 'Python'})
                <textarea
                  className="contest-source"
                  rows={6}
                  value={form.starterCode[language]}
                  onChange={(e) => change('starterCode', { ...form.starterCode, [language]: e.target.value })}
                />
              </label>
            </div>
          ))}
        </fieldset>

        {/* Hành động lưu */}
        <div className="hsg-btn-group" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="hsg-btn hsg-btn-secondary"
            disabled={busy}
            onClick={showPreview}
          >
            Xem trước
          </button>
          <button
            type="button"
            className="hsg-btn hsg-btn-secondary"
            disabled={busy || locked}
            onClick={() => save('draft')}
          >
            Lưu bản nháp
          </button>
          <button
            type="button"
            className="hsg-btn hsg-btn-primary"
            disabled={busy || locked || !previewCurrent}
            onClick={() => save('published')}
          >
            {busy ? 'Đang lưu…' : 'Xuất bản bài tập'}
          </button>
        </div>

        {error && <p role="alert" className="err" style={{ marginTop: 14 }}>{error}</p>}
      </form>

      {/* Xem trước góc nhìn học sinh */}
      {preview && (
        <section aria-label="Xem trước góc nhìn học sinh" className="contest-card bank-ui" style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--hsg-text-secondary)', marginBottom: 8 }}>
            Xem trước góc nhìn học sinh
          </h2>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--hsg-text-primary)' }}>
            {preview.problem.title}
          </h1>
          <ProblemStatement problem={preview.problem} />
          {preview.problem.allowedLanguages.map((l) => (
            <div key={l} style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--hsg-text-primary)' }}>
                Mã khởi tạo {l === 'cpp' ? 'C++' : 'Python'}
              </h3>
              <pre><code>{preview.problem.starterCode[l]}</code></pre>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

export function TeacherProblemEditor() {
  const { problemId } = useParams();
  const { state: locationState } = useLocation();
  const loader = useCallback(
    () => problemId ? loadTeacherProblem(problemId) : Promise.resolve(locationState?.imported ?? null),
    [problemId, locationState]
  );
  const state = useContestData(loader);
  if (state.loading || state.error) return <ContestError state={state} />;
  return (
    <div className="content hsg-page">
      <div className="hsg-frame-inner">
        <ProblemForm key={problemId ?? 'new'} problemId={problemId} initial={state.value} />
      </div>
    </div>
  );
}
