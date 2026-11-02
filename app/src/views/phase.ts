import type { PhaseRun } from '../api';
import { h } from '../lib/dom';
import { loadPhase, type PhaseData } from '../phase-data';
import { PASS_SCORE, WEAK_BELOW, feedbackFor, formatDuration, weakTopicsOf, type TestResult } from '../phase-test';
import { PHASES } from '../phases';
import { browserStore } from '../session-store';
import { loadTest, testKey } from '../test-store';

const when = (iso: string): string => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

/** Rebuild a TestResult from a stored attempt so the old feedback can be shown again. */
function resultOf(run: PhaseRun): TestResult {
  return { total: run.n_questions, correct: run.n_correct, score: run.score, passed: run.passed, topics: run.topic_scores, weakTopics: weakTopicsOf(run.topic_scores), weakLessons: run.weak_lessons };
}

function historyRow(data: PhaseData, run: PhaseRun, number: number, previous: PhaseRun | null): HTMLElement {
  const fb = feedbackFor(resultOf(run), data.topicName, previous ? previous.score : null);
  const detail = h('div', { class: 'hist-detail' },
    h('p', {}, h('b', {}, fb.headline), ' ', fb.praise),
    h('p', {}, fb.advice),
    ...(run.topic_scores.length
      ? [h('ul', { class: 'weak-list' }, ...run.topic_scores.map((t) => h('li', {}, `${data.topicName(t.topic_code)}: ${t.correct}/${t.total} câu${t.total >= 2 && t.correct / t.total < WEAK_BELOW ? ' · cần ôn' : ''}`)))]
      : []),
    ...(run.weak_lessons.length
      ? [h('p', {}, h('b', {}, 'Nên học lại: ')), h('ul', { class: 'weak-list' }, ...run.weak_lessons.map((w) => h('li', {}, h('a', { href: `#/lesson/${w.lesson_id}` }, `Bài ${w.ord} · ${w.title}`), ` · sai ${w.missed}/${w.of} câu`)))]
      : []));
  return h('details', { class: 'hist-row' },
    h('summary', {},
      h('span', { class: 'no' }, `Lần ${number}`),
      h('span', {}, when(run.finished_at)),
      h('span', {}, formatDuration(run.duration_s)),
      h('b', { class: run.passed ? 'sc ok' : 'sc low' }, `${run.score.toFixed(1)}/10`),
      h('span', { class: run.passed ? 'pill done' : 'pill warn' }, run.passed ? '✓ Đạt' : 'Chưa đạt'),
      h('span', { class: 'cm' }, run.comment)),
    detail);
}

export async function phaseView(phase: number, userId: string): Promise<HTMLElement> {
  const root = h('main', { class: 'page' }, h('a', { class: 'back', href: '#/' }, '‹ Về trang chủ'));
  if (!PHASES[phase]) {
    root.append(h('h1', {}, 'Không có giai đoạn này'));
    return root;
  }
  let data: PhaseData;
  try {
    data = await loadPhase(phase);
  } catch {
    root.append(h('p', { class: 'error', role: 'alert' }, 'Không tải được thông tin bài kiểm tra. Em kiểm tra mạng rồi tải lại trang nhé.'));
    return root;
  }
  const { plan } = data;
  const inProgress = loadTest(browserStore(), testKey(userId, phase)) !== null;

  root.append(
    h('h1', {}, `Bài kiểm tra · ${PHASES[phase].title}`),
    h('p', { class: 'hint' }, `Gồm các chủ điểm: ${data.topics.map((t) => t.name_vi).join(', ')}`),
    h('div', { class: 'facts' },
      h('div', {}, h('b', {}, String(plan.questions)), ' câu'),
      h('div', {}, h('b', {}, String(Math.round(plan.timeLimitS / 60))), ' phút'),
      h('div', {}, 'Đạt từ ', h('b', {}, `${PASS_SCORE}/10`)),
      h('div', {}, 'Làm được ', h('b', {}, 'nhiều lần'))),
    h('section', { class: 'panel' },
      h('h2', {}, 'Bài kiểm tra này như thế nào?'),
      h('ul', { class: 'rules' },
        h('li', {}, `Câu hỏi được chọn ngẫu nhiên từ ngân hàng câu hỏi của các bài em đã học trong giai đoạn, xen kẽ các chủ điểm. Mỗi lần làm lại sẽ có câu mới.`),
        h('li', {}, 'Em được quay lại sửa đáp án trước khi nộp. Đáp án đúng chỉ hiện sau khi nộp bài, kèm lời giải từng câu.'),
        h('li', {}, `Thang điểm 10, đạt từ ${PASS_SCORE}. Dù đã đạt, em vẫn được báo phần nào còn yếu để ôn thêm.`),
        h('li', {}, 'Hết giờ thì bài tự được nộp. Đồng hồ chạy theo giờ thật, nên chuyển tab hay tải lại trang vẫn không mất bài đang làm.'))));

  const start = h('section', { class: 'panel' });
  if (data.progress.unlocked || inProgress) {
    start.append(
      h('p', {}, inProgress ? 'Em đang có một bài kiểm tra làm dở. Bấm để tiếp tục.' : 'Em đã luyện xong tất cả các bài trong giai đoạn này. Sẵn sàng chưa nào?'),
      h('a', { class: 'btn', href: `#/phase/${phase}/test` }, inProgress ? 'Tiếp tục bài kiểm tra' : data.runs.length ? 'Làm lại bài kiểm tra' : 'Bắt đầu làm bài kiểm tra'));
  } else {
    start.append(
      h('p', {}, `Bài kiểm tra sẽ mở khi em đã luyện mỗi bài trong giai đoạn này ít nhất một lần. Em mới luyện ${data.progress.practiced}/${data.progress.total} bài.`),
      h('button', { class: 'btn', type: 'button', disabled: true, 'aria-disabled': 'true' }, 'Chưa mở'));
    if (data.unpractised.length) {
      start.append(h('p', { class: 'hint' }, 'Các bài em chưa luyện:'),
        h('ul', { class: 'weak-list' },
          ...data.unpractised.slice(0, 12).map((l) => h('li', {}, h('a', { href: `#/lesson/${l.lesson_id}` }, `Bài ${l.ord} · ${l.title}`), ` (${data.topicName(l.topic_code)})`)),
          data.unpractised.length > 12 ? h('li', { class: 'hint' }, `… và ${data.unpractised.length - 12} bài nữa`) : null));
    }
  }
  root.append(start);

  const hist = h('section', { class: 'panel' }, h('h2', {}, 'Các lần làm trước'));
  if (data.runsError) {
    hist.append(h('p', { class: 'hint' }, 'Chưa xem được lịch sử (cơ sở dữ liệu chưa được cập nhật hoặc mạng có vấn đề).'));
  } else if (data.runs.length === 0) {
    hist.append(h('p', { class: 'hint' }, 'Em chưa làm bài kiểm tra này lần nào. Kết quả mỗi lần sẽ được ghi lại ở đây.'));
  } else {
    const asc = [...data.runs].sort((a, b) => a.finished_at.localeCompare(b.finished_at));
    const best = Math.max(...asc.map((r) => r.score));
    hist.append(h('p', { class: 'hint' }, `${asc.length} lần làm · điểm cao nhất ${best.toFixed(1)}/10`));
    const list = h('div', { class: 'hist' }, h('div', { class: 'hist-head' }, h('span', {}, 'Lần'), h('span', {}, 'Thời điểm'), h('span', {}, 'Thời gian làm'), h('span', {}, 'Điểm'), h('span', {}, 'Kết quả'), h('span', {}, 'Nhận xét')));
    [...asc].reverse().forEach((run) => {
      const i = asc.indexOf(run);
      list.append(historyRow(data, run, i + 1, i > 0 ? asc[i - 1] : null));
    });
    hist.append(list);
  }
  root.append(hist);
  return root;
}
