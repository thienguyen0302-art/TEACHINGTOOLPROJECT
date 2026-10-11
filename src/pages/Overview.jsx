import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useNotice } from "../hooks/useNotice";
import { languageCourses, LANG_BY_KEY } from "../data/curriculum";
import { firstName, todayText } from "../utils/format";

// Các khối chưa có dữ liệu thật (chuỗi ngày học, XP, nhật ký, bài tập…) giữ số liệu mẫu của bản thiết kế.
export default function Overview({ user, lang, data, onChangeLang }) {
  const nav = useNavigate();
  const notice = useNotice();
  const label = LANG_BY_KEY[lang];
  const course = languageCourses[label];
  const firstChapter = data.chapters[0];

  const openFirst = () => {
    if (firstChapter) nav(`/lesson/${firstChapter.id}`);
    else notice("Nội dung bài học đang được cập nhật");
  };

  return (
    <div className="content overview-content">
      <section className="overview-hero">
        <div className="overview-copy">
          <div className="overview-kicker">
            <span><Icon name="code" /></span>
            Lộ trình {label} của bạn
          </div>
          <p className="overview-date">{todayText()}</p>
          <h1>
            <span className="greeting-line">Chào {firstName(user)}, hôm nay mình</span>
            <span className="start-line">bắt đầu viết code nhé!</span>
          </h1>
          <p className="overview-description">
            Mỗi lập trình viên giỏi đều bắt đầu từ một dòng code đầu tiên. PeanutCode sẽ đồng
            hành cùng bạn từng bước, từ nền tảng đến những bài toán thú vị.
          </p>
          <div className="overview-actions">
            <button onClick={openFirst}>
              <span><Icon name="play" /></span>
              Bắt đầu bài học đầu tiên
            </button>
            <button className="change-course" onClick={onChangeLang}>Đổi ngôn ngữ</button>
          </div>
          <div className="first-step-note">
            <span>01</span>
            <p><strong>Không cần biết trước lập trình</strong>Bài học được thiết kế dành cho người mới bắt đầu.</p>
          </div>
        </div>

        <div className="first-lesson-card">
          <div className="lesson-window-bar">
            <div><i /><i /><i /></div>
            <span>bai_hoc_01.{lang === "python" ? "py" : "cpp"}</span>
            <em>{label}</em>
          </div>
          <div className="lesson-code">
            <div className="line-numbers">1<br />2<br />3<br />4<br />5<br />6</div>
            <pre>{course.code}</pre>
          </div>
          <div className="lesson-info">
            <span>Bài học đầu tiên</span>
            <h2>{course.firstLesson}</h2>
            <p><Icon name="clock" /> Khoảng 15 phút <i /> <Icon name="book" /> Kiến thức nền tảng</p>
            <button onClick={openFirst}>Vào học ngay <Icon name="chevron" /></button>
          </div>
        </div>
      </section>

      <section className="overview-roadmap">
        <div><span>Bước đầu tiên</span><strong>Làm quen cú pháp</strong></div>
        <i />
        <div><span>Tiếp theo</span><strong>Biến & dữ liệu</strong></div>
        <i />
        <div><span>Sau đó</span><strong>Rẽ nhánh tư duy</strong></div>
      </section>

      <section className="learning-hub">
        <div className="learning-hub-heading">
          <div>
            <span>Lộ trình học tập</span>
            <h2>Học chắc từng phần, chinh phục từng bài toán.</h2>
          </div>
          <p>
            Nội dung được sắp xếp theo đúng trình tự từ kiến thức nền tảng đến vận dụng trong
            các đề thi học sinh giỏi thực tiễn.
          </p>
        </div>

        <div className="learning-section-grid">
          <article className="learning-section-card theory-card">
            <div className="learning-card-top">
              <span className="learning-card-icon"><Icon name="book" /></span>
              <span className="learning-status active">Đang học</span>
            </div>
            <span className="learning-index">Phần 01</span>
            <h3>Lý thuyết</h3>
            <p>Nắm chắc khái niệm, cú pháp và tư duy cốt lõi qua nội dung ngắn gọn, ví dụ trực quan.</p>
            <div className="learning-meta">
              <span><Icon name="book" /> 24 bài học</span>
              <span><Icon name="clock" /> 8 giờ</span>
            </div>
            <div className="learning-card-progress">
              <div><span>Tiến độ</span><strong>35%</strong></div>
              <div className="progress-track"><span style={{ width: "35%" }} /></div>
            </div>
            <button onClick={() => nav("/curriculum")}>Tiếp tục học lý thuyết <Icon name="chevron" /></button>
          </article>

          <article className="learning-section-card practice-card">
            <div className="learning-card-top">
              <span className="learning-card-icon"><Icon name="code" /></span>
              <span className="learning-status">40 bài tập</span>
            </div>
            <span className="learning-index">Phần 02</span>
            <h3>Thực hành</h3>
            <p>Viết code trực tiếp, nhận kết quả chấm bài và gợi ý để cải thiện từng lời giải.</p>
            <div className="learning-meta">
              <span><Icon name="check" /> Chấm tự động</span>
              <span><Icon name="chart" /> Theo dõi kết quả</span>
            </div>
            <div className="learning-levels">
              <span>Cơ bản</span><span>Vận dụng</span><span>Nâng cao</span>
            </div>
            <button onClick={() => notice("Khu thực hành đang được cập nhật")}>Vào khu thực hành <Icon name="chevron" /></button>
          </article>

          <article className="learning-section-card review-card">
            <div className="learning-card-top">
              <span className="learning-card-icon"><Icon name="grid" /></span>
              <span className="learning-status">Theo chương</span>
            </div>
            <span className="learning-index">Phần 03</span>
            <h3>Ôn tập tổng hợp chương</h3>
            <p>Hệ thống lại kiến thức, luyện bài tổng hợp và kiểm tra mức độ thành thạo sau mỗi chương.</p>
            <div className="review-checklist">
              <span><i><Icon name="check" /></i>Tóm tắt kiến thức trọng tâm</span>
              <span><i><Icon name="check" /></i>Bài kiểm tra cuối chương</span>
            </div>
            <button onClick={() => nav("/curriculum")}>Xem nội dung ôn tập <Icon name="chevron" /></button>
          </article>

          <article className="learning-section-card contest-card">
            <div className="contest-glow" />
            <div className="learning-card-top">
              <span className="learning-card-icon"><Icon name="trophy" /></span>
              <span className="learning-status">Thử thách</span>
            </div>
            <span className="learning-index">Phần 04</span>
            <h3>Làm đề HSG Tin học thực tiễn</h3>
            <p>Giải các bộ đề chọn đội tuyển và đề thi thực tế với thời gian, giới hạn bộ nhớ như phòng thi.</p>
            <div className="contest-stats">
              <div><strong>18</strong><span>Bộ đề</span></div>
              <div><strong>120'</strong><span>Mỗi đề</span></div>
              <div><strong>AI</strong><span>Phân tích</span></div>
            </div>
            <button onClick={() => notice("Kho đề HSG Tin học đang được cập nhật")}>Bắt đầu luyện đề <Icon name="chevron" /></button>
          </article>
        </div>
      </section>

      <section className="daily-challenge">
        <div className="challenge-copy">
          <span className="challenge-label"><Icon name="fire" /> Thử thách hôm nay</span>
          <h2>Tìm số lớn nhất trong ba số</h2>
          <p>
            Vận dụng câu lệnh điều kiện để tìm đáp án tối ưu. Hoàn thành trong 15 phút để nhận
            thêm 50 điểm kinh nghiệm.
          </p>
          <div className="challenge-meta">
            <span><Icon name="clock" /> 15 phút</span>
            <span><Icon name="chart" /> Cơ bản</span>
            <span><Icon name="trophy" /> +50 XP</span>
          </div>
          <button onClick={() => notice("Thử thách hằng ngày đang được cập nhật")}>
            Làm thử thách ngay <Icon name="chevron" />
          </button>
        </div>
        <div className="challenge-visual" aria-hidden="true">
          <span className="challenge-code-line">if (a &gt; b)</span>
          <span className="challenge-code-line">max = a;</span>
          <div className="challenge-badge"><Icon name="trophy" /><strong>+50</strong><small>điểm XP</small></div>
        </div>
      </section>

      <section className="overview-insights">
        <div className="week-progress-card">
          <div className="insight-heading">
            <div><span>Tiến độ tuần</span><h2>Một tuần học tập hiệu quả</h2></div>
            <strong>5/7 ngày</strong>
          </div>
          <div className="study-days">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day, index) => (
              <div className={index < 5 ? "completed" : index === 5 ? "today" : ""} key={day}>
                <span>{index < 5 ? <Icon name="check" /> : index + 1}</span>
                <small>{day}</small>
              </div>
            ))}
          </div>
          <div className="week-summary">
            <div><span><Icon name="clock" /></span><p><strong>4 giờ 25 phút</strong><small>Thời gian học</small></p></div>
            <div><span><Icon name="code" /></span><p><strong>18 bài</strong><small>Đã hoàn thành</small></p></div>
            <div><span><Icon name="fire" /></span><p><strong>5 ngày</strong><small>Chuỗi hiện tại</small></p></div>
          </div>
        </div>

        <div className="mentor-card">
          <div className="mentor-top">
            <span className="mentor-icon">AI</span>
            <span>Gợi ý dành cho bạn</span>
          </div>
          <h2>Hãy ôn lại câu lệnh điều kiện</h2>
          <p>
            Bạn đã làm tốt phần nhập xuất. Trước khi sang vòng lặp, hãy hoàn thành thêm 3 bài
            điều kiện để củng cố tư duy rẽ nhánh.
          </p>
          <div className="mentor-progress"><span><i /></span><strong>2/5 bài</strong></div>
          <button onClick={() => notice("Gợi ý của AI đang được cập nhật")}>
            Xem bài được đề xuất <Icon name="chevron" />
          </button>
        </div>
      </section>

      <section className="recent-learning">
        <div className="recent-heading">
          <div><span>Nhật ký học tập</span><h2>Hoạt động gần đây</h2></div>
          <button onClick={() => nav("/progress")}>Xem tất cả <Icon name="chevron" /></button>
        </div>
        <div className="recent-list">
          <article>
            <span className="recent-icon done"><Icon name="check" /></span>
            <div><strong>Hoàn thành bài “Biến và kiểu dữ liệu”</strong><small>Hôm nay, 09:30 · Điểm số 9/10</small></div>
            <em>+30 XP</em>
          </article>
          <article>
            <span className="recent-icon code"><Icon name="code" /></span>
            <div><strong>Nộp bài “Tính tổng hai số”</strong><small>Hôm qua, 20:15 · Accepted</small></div>
            <em>Đúng 100%</em>
          </article>
          <article>
            <span className="recent-icon badge"><Icon name="trophy" /></span>
            <div><strong>Nhận huy hiệu “Khởi đầu thuận lợi”</strong><small>18 tháng 5 · Hoàn thành 10 bài đầu tiên</small></div>
            <em>Huy hiệu mới</em>
          </article>
        </div>
      </section>
    </div>
  );
}
