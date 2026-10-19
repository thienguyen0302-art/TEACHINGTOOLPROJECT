import { useState, useMemo } from "react";
import Icon from "./Icon";
import "./HelpCenterModal.css";

const HELP_SECTIONS = [
  { id: "quickstart", label: "Bắt đầu học", icon: "book" },
  { id: "judge", label: "Quy tắc chấm bài", icon: "code" },
  { id: "ai", label: "Trợ lý AI", icon: "fire" },
  { id: "contest", label: "Contest HSG", icon: "trophy" },
  { id: "faq", label: "Câu hỏi thường gặp", icon: "help" },
  { id: "contact", label: "Hỗ trợ & Liên hệ", icon: "user" },
];

const FAQ_ITEMS = [
  {
    q: "Làm thế nào để đổi giữa C++ và Python?",
    a: "Bạn có thể bấm vào ảnh đại diện hoặc menu tài khoản ở góc trên bên phải, chọn 'Đổi ngôn ngữ học', hoặc chọn lại trong trang Hồ sơ cá nhân. Tiến độ học của C++ và Python được lưu độc lập nhau.",
  },
  {
    q: "Chuỗi ngày học (Streak) được tính như thế nào?",
    a: "Chuỗi ngày học tăng lên mỗi ngày bạn hoàn thành ít nhất 1 bài tập code, 1 bài quiz lý thuyết hoặc dành từ 5 phút ôn luyện trên hệ thống. Nếu bỏ lỡ một ngày không đăng nhập học, chuỗi streak sẽ được tính lại từ đầu.",
  },
  {
    q: "Tại sao bài nộp đạt 100 điểm mà chưa thành công?",
    a: "Để được tính là hoàn thành (Accepted), bài làm của bạn phải vượt qua 100% tất cả các test case (bao gồm cả test case công khai và test case ẩn). Nếu bài làm bị lỗi thời gian (TLE) hoặc lỗi chạy (RTE) ở bất kỳ test nào, hệ thống sẽ đánh dấu là 'Cần cải thiện'.",
  },
  {
    q: "Trợ lý AI có giải bài hộ tôi không?",
    a: "Không. Triết lý của PeanutCode là rèn luyện tư duy thuật toán độc lập. AI sẽ không đưa ra lời giải hoàn chỉnh mà chỉ phân tích độ phức tạp Big-O, chỉ ra các trường hợp biên (edge cases) mà bạn chưa xét tới, hoặc gợi ý hướng tiếp cận tối ưu hơn.",
  },
  {
    q: "Làm sao để xem lại mã nguồn các bài tôi đã nộp trước đây?",
    a: "Bạn vào mục 'Lịch sử bài nộp' trên thanh điều hướng bên trái. Tại đây bạn có thể xem lại toàn bộ các bài nộp code, số lần thử, điểm số tốt nhất cũng như thời gian nộp bài của từng bài tập.",
  },
  {
    q: "Điểm trên bảng xếp hạng (Ranking) được tính ra sao?",
    a: "Bảng xếp hạng Contest HSG tổng hợp điểm từ các contest bạn đã tham gia. Mỗi bài giữ điểm tốt nhất; điểm được tính từ kết quả máy chấm trên máy chủ.",
  },
  {
    q: "Giáo viên theo dõi kết quả của tôi như thế nào?",
    a: "Giáo viên phụ trách đội tuyển có trang Quản trị riêng để xem tiến độ của từng học sinh: điểm trung bình quiz, các chuyên đề còn yếu, lịch sử bài nộp trong các kỳ thi contest, và có thể gửi nhắc nhở bồi dưỡng khi cần.",
  },
];

const JUDGE_VERDICTS = [
  {
    code: "AC",
    title: "Accepted (Đúng hoàn toàn)",
    color: "green",
    desc: "Chúc mừng! Chương trình chạy đúng tất cả test cases trong thời gian và bộ nhớ cho phép.",
  },
  {
    code: "WA",
    title: "Wrong Answer (Sai kết quả)",
    color: "red",
    desc: "Chương trình chạy được nhưng đáp án in ra không khớp với kết quả chuẩn. Thường do chưa xét trường hợp đặc biệt (số âm, n=0, n cực đại...) hoặc in thừa dấu cách/xuống dòng.",
  },
  {
    code: "TLE",
    title: "Time Limit Exceeded (Quá thời gian)",
    color: "orange",
    desc: "Chương trình chạy lâu hơn thời gian quy định (thường là 1.0 giây). Bạn cần giảm độ phức tạp thuật toán (ví dụ: tối ưu từ O(N²) xuống O(N log N) hoặc O(N)).",
  },
  {
    code: "RTE",
    title: "Runtime Error (Lỗi khi chạy)",
    color: "purple",
    desc: "Chương trình bị dừng đột ngột giữa chừng. Nguyên nhân phổ biến: truy cập ngoài biên mảng (Out of bounds), chia cho số 0, hoặc tràn bộ nhớ ngăn xếp đệ quy (Stack Overflow).",
  },
  {
    code: "CE",
    title: "Compilation Error (Lỗi biên dịch)",
    color: "gray",
    desc: "Mã nguồn bị lỗi cú pháp không thể biên dịch thành file chạy. Bạn hãy kiểm tra lại dấu chấm phẩy, khai báo biến, hoặc tên thư viện.",
  },
];

export default function HelpCenterModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("quickstart");
  const [search, setSearch] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Lọc FAQ theo tìm kiếm
  const filteredFaqs = useMemo(() => {
    if (!search.trim()) return FAQ_ITEMS;
    const q = search.toLowerCase().trim();
    return FAQ_ITEMS.filter(
      (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="hcm-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="hcm-modal" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ────────────────────────────────────────── */}
        <div className="hcm-header">
          <div className="hcm-header-left">
            <span className="hcm-kicker">
              <Icon name="help" /> TRUNG TÂM TRỢ GIÚP &amp; HƯỚNG DẪN
            </span>
            <h2 className="hcm-title">Bạn cần hỗ trợ điều gì?</h2>
            <p className="hcm-subtitle">
              Tìm hiểu quy chế thi, hướng dẫn sử dụng máy chấm tự động và giải đáp các thắc mắc thường gặp.
            </p>
          </div>
          <button
            type="button"
            className="hcm-close-btn"
            onClick={onClose}
            aria-label="Đóng trợ giúp"
            title="Đóng (Esc)"
          >
            <Icon name="x" />
          </button>
        </div>

        {/* ── Search Bar ────────────────────────────────────── */}
        <div className="hcm-search-wrap">
          <div className="hcm-search-box">
            <Icon name="search" />
            <input
              type="search"
              placeholder="Tìm nhanh câu hỏi, quy tắc chấm bài, mã lỗi AC/WA/TLE..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value && activeTab !== "faq") setActiveTab("faq");
              }}
              aria-label="Tìm kiếm trợ giúp"
            />
            {search && (
              <button
                type="button"
                className="hcm-search-clear"
                onClick={() => setSearch("")}
                aria-label="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Body Layout: Tabs bên trái + Nội dung bên phải ── */}
        <div className="hcm-body">
          {/* Navigation Tabs */}
          <nav className="hcm-nav" aria-label="Danh mục trợ giúp">
            {HELP_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                className={`hcm-nav-item ${activeTab === sec.id ? "active" : ""}`}
                onClick={() => setActiveTab(sec.id)}
              >
                <Icon name={sec.icon} />
                <span>{sec.label}</span>
              </button>
            ))}
          </nav>

          {/* Main Content Pane */}
          <div className="hcm-content" role="region">
            {/* 1. BẮT ĐẦU HỌC */}
            {activeTab === "quickstart" && (
              <div className="hcm-pane">
                <h3>Lộ trình ôn thi HSG cùng PeanutCode</h3>
                <p>
                  PeanutCode được thiết kế theo lộ trình chuẩn 14 chuyên đề từ cơ bản đến nâng cao cho cả 2 ngôn ngữ <strong>C++</strong> và <strong>Python</strong>:
                </p>

                <div className="hcm-steps-grid">
                  <div className="hcm-step-card">
                    <span className="hcm-step-num">01</span>
                    <h4>Học Lý thuyết &amp; Cú pháp</h4>
                    <p>Mỗi chuyên đề mở đầu bằng kiến thức trọng tâm ngắn gọn, ví dụ trực quan và code mẫu chạy thử nghiệm.</p>
                  </div>

                  <div className="hcm-step-card">
                    <span className="hcm-step-num">02</span>
                    <h4>Làm Quiz &amp; Tự kiểm tra</h4>
                    <p>Các câu hỏi trắc nghiệm rèn tư duy đọc hiểu code, dự đoán kết quả và nhận diện các bẫy thường gặp.</p>
                  </div>

                  <div className="hcm-step-card">
                    <span className="hcm-step-num">03</span>
                    <h4>Thực hành nộp code tự động</h4>
                    <p>Luyện tập tại Kho bài tập, viết code trực tiếp trên trình soạn thảo và nhận kết quả chấm từ máy chấm Judge0 trong vài giây.</p>
                  </div>

                  <div className="hcm-step-card">
                    <span className="hcm-step-num">04</span>
                    <h4>Tham gia Contest HSG</h4>
                    <p>Làm quen với áp lực phòng thi, thời gian đếm ngược và kiểm tra năng lực với các bộ đề thi học sinh giỏi chọn đội tuyển thực tế.</p>
                  </div>
                </div>

                <div className="hcm-tip-box">
                  <Icon name="fire" />
                  <div>
                    <strong>Mẹo học hiệu quả:</strong>
                    <span> Hãy duy trì học ít nhất 15-20 phút mỗi ngày để giữ vững chuỗi Streak và tích lũy điểm kinh nghiệm (XP) trên Bảng xếp hạng.</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. QUY TẮC CHẤM BÀI */}
            {activeTab === "judge" && (
              <div className="hcm-pane">
                <h3>Các trạng thái phản hồi của Máy chấm (Judge)</h3>
                <p>
                  Khi bạn bấm <strong>"Nộp bài"</strong>, hệ thống sẽ biên dịch và chạy code với hàng chục bộ test ẩn (hidden testcases) để kiểm tra độ chính xác, tốc độ và bộ nhớ.
                </p>

                <div className="hcm-verdict-list">
                  {JUDGE_VERDICTS.map((v) => (
                    <article key={v.code} className={`hcm-verdict-card hcm-verdict--${v.color}`}>
                      <div className="hcm-verdict-badge">
                        <code>{v.code}</code>
                      </div>
                      <div className="hcm-verdict-info">
                        <h4>{v.title}</h4>
                        <p>{v.desc}</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hcm-guideline-box">
                  <h4>Quy ước chuẩn đầu vào &amp; đầu ra:</h4>
                  <ul>
                    <li>Nhập xuất qua dòng chuẩn (Standard Input / Standard Output - <code>cin/cout</code> trong C++, <code>input()/print()</code> trong Python).</li>
                    <li>Không in các câu nhắc nhập dữ liệu thừa như <em>"Hay nhap n:"</em> vì máy chấm sẽ tính là Wrong Answer.</li>
                    <li>Trong C++, nên dùng <code>ios_base::sync_with_stdio(false); cin.tie(NULL);</code> để tối ưu tốc độ nhập xuất.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 3. TRỢ LÝ AI */}
            {activeTab === "ai" && (
              <div className="hcm-pane">
                <h3>Trợ lý học tập thông minh (AI Tutor)</h3>
                <p>
                  PeanutCode tích hợp trợ lý AI được tinh chỉnh chuyên biệt cho bộ môn Tin học thi học sinh giỏi.
                </p>

                <div className="hcm-feature-list">
                  <div className="hcm-feature-item">
                    <div className="hcm-feature-icon"><Icon name="code" /></div>
                    <div>
                      <h4>Phân tích độ phức tạp thuật toán (Big-O)</h4>
                      <p>AI sẽ phân tích code của bạn có độ phức tạp thời gian $O(N)$, $O(N^2)$ hay $O(N \log N)$ và cho biết có nguy cơ bị Time Limit Exceeded với giới hạn $N$ của đề bài hay không.</p>
                    </div>
                  </div>

                  <div className="hcm-feature-item">
                    <div className="hcm-feature-icon"><Icon name="fire" /></div>
                    <div>
                      <h4>Chỉ ra các trường hợp biên (Edge Cases)</h4>
                      <p>Khi bị Wrong Answer, thay vì đưa ra đáp án, AI sẽ gợi mở những trường hợp bạn có thể đã bỏ quên: mảng có 1 phần tử, số âm, số nguyên 64-bit vượt quá kiểu <code>int</code> (cần dùng <code>long long</code>)...</p>
                    </div>
                  </div>

                  <div className="hcm-feature-item">
                    <div className="hcm-feature-icon"><Icon name="help" /></div>
                    <div>
                      <h4>Giải thích thông báo lỗi Runtime Error &amp; Biên dịch</h4>
                      <p>AI dịch các thông báo lỗi tiếng Anh khó hiểu thành lời giải thích tiếng Việt rõ ràng, chỉ rõ dòng code gây lỗi.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. CONTEST HSG */}
            {activeTab === "contest" && (
              <div className="hcm-pane">
                <h3>Quy chế thi Contest HSG</h3>
                <p>
                  Học sinh tham gia <strong>Contest lập trình trực tuyến</strong> theo lịch do giáo viên thiết lập:
                </p>

                <div className="hcm-contest-rules">
                  <div className="hcm-rule-item">
                    <strong>1. Thời gian thi chuẩn:</strong>
                    <p>Các kỳ thi contest thường kéo dài từ 90 đến 180 phút. Đồng hồ đếm ngược được đồng bộ theo máy chủ. Khi hết giờ, bài làm sẽ tự động được thu nhận.</p>
                  </div>

                  <div className="hcm-rule-item">
                    <strong>2. Chấm điểm từng phần (Partial Scoring):</strong>
                    <p>Mỗi bài tập thường có từ 10 đến 20 testcases tương ứng với các subtask. Thí sinh giải đúng subtask nào sẽ nhận điểm của subtask đó mà không cần phải đúng toàn bộ 100%.</p>
                  </div>

                  <div className="hcm-rule-item">
                    <strong>3. Bảng xếp hạng Realtime (Leaderboard):</strong>
                    <p>Thí sinh được xếp hạng theo: Tổng điểm đạt được (giảm dần). Nếu bằng điểm nhau, thí sinh có thời điểm nộp bài đạt điểm số đó sớm hơn sẽ đứng trên.</p>
                  </div>

                  <div className="hcm-rule-item">
                    <strong>4. Độc lập &amp; Bảo mật đề thi:</strong>
                    <p>Đề thi trong contest chỉ được mở đúng thời điểm bắt đầu. Bài tập đã đưa vào contest sẽ được khóa nội dung để đảm bảo tính công bằng tuyệt đối cho toàn bộ thí sinh.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. CÂU HỎI THƯỜNG GẶP (FAQ) */}
            {activeTab === "faq" && (
              <div className="hcm-pane">
                <h3>Câu hỏi thường gặp ({filteredFaqs.length})</h3>
                <div className="hcm-faq-list">
                  {filteredFaqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <article key={idx} className={`hcm-faq-item ${isOpen ? "open" : ""}`}>
                        <button
                          type="button"
                          className="hcm-faq-question"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          aria-expanded={isOpen}
                        >
                          <span>{faq.q}</span>
                          <span className="hcm-faq-chevron">
                            <Icon name="chevron" />
                          </span>
                        </button>
                        {isOpen && (
                          <div className="hcm-faq-answer">
                            <p>{faq.a}</p>
                          </div>
                        )}
                      </article>
                    );
                  })}
                  {filteredFaqs.length === 0 && (
                    <div className="hcm-empty-search">
                      <p>Không tìm thấy câu hỏi nào phù hợp với từ khóa "{search}".</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. HỖ TRỢ & LIÊN HỆ */}
            {activeTab === "contact" && (
              <div className="hcm-pane">
                <h3>Thông tin Ban quản trị &amp; Hỗ trợ kỹ thuật</h3>
                <p>
                  Nếu bạn gặp sự cố kỹ thuật, phát hiện sai sót trong đề bài hoặc cần hỗ trợ thêm, hãy liên hệ với chúng tôi:
                </p>

                <div className="hcm-contact-card">
                  <div className="hcm-contact-avatar">LT</div>
                  <div className="hcm-contact-info">
                    <h4>Cô Lý Thị Thanh Thúy</h4>
                    <p className="hcm-contact-role">Tổ trưởng tổ Tin học · Tác giả nền tảng PeanutCode</p>
                    <p>Trường TH và THCS Cái Dầu, Huyện Châu Phú, Tỉnh An Giang</p>
                    <div className="hcm-contact-links">
                      <a href="tel:0364224470">
                        <Icon name="help" /> Hotline: <strong>0364 224 470</strong>
                      </a>
                      <a href="mailto:lythuy84@gmail.com">
                        <Icon name="code" /> Email: <strong>lythuy84@gmail.com</strong>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="hcm-tip-box" style={{ marginTop: 20 }}>
                  <Icon name="check" />
                  <div>
                    <strong>Bạn muốn đóng góp đề thi hoặc báo lỗi?</strong>
                    <span> Bạn có thể sử dụng tính năng <em>"Góp ý &amp; Đánh giá"</em> trong menu tài khoản để gửi ý kiến trực tiếp tới ban quản trị.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="hcm-footer">
          <span className="hcm-footer-note">
            PeanutCode — Nền tảng ôn luyện học sinh giỏi Tin học trực tuyến
          </span>
          <button type="button" className="hcm-footer-btn" onClick={onClose}>
            Đã hiểu &amp; Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
