import { LessonTable } from "./LessonTheory";

export default function LessonSummary({ chapter }) {
  return <section className="lesson-summary" aria-labelledby="lesson-summary-title">
    <div className="lesson-section-heading"><span>TỔNG KẾT CHƯƠNG</span><h3 id="lesson-summary-title">Khép lại và ghi nhớ</h3></div>
    <section className="lesson-summary__takeaways"><h4>Những điều cần nhớ</h4><ul>{chapter.chapterSummary.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
    <section className="lesson-summary__mistakes"><h4>Lỗi thường gặp</h4><div>{chapter.commonMistakes.map((item, index) => <article key={index}><p><b>{item.mistake}</b></p><p><span>Cách sửa:</span> {item.fix}</p></article>)}</div></section>
    {chapter.cppVsPython?.length > 0 && <section><h4>So sánh C++ / Python</h4><LessonTable rows={chapter.cppVsPython} /></section>}
  </section>;
}
