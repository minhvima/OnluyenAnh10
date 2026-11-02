/** The four learning phases (docs/learning-path.md). */
export const PHASES: Record<number, { title: string; name: string; weeks: string }> = {
  1: { title: 'Giai đoạn 1 · Nền tảng', name: 'Nền tảng', weeks: 'tuần 1–4' },
  2: { title: 'Giai đoạn 2 · Mở rộng', name: 'Mở rộng', weeks: 'tuần 5–7' },
  3: { title: 'Giai đoạn 3 · Biến đổi câu', name: 'Biến đổi câu', weeks: 'tuần 8–11' },
  4: { title: 'Giai đoạn 4 · Hoàn thiện', name: 'Hoàn thiện', weeks: 'tuần 12' },
};
export const PHASE_IDS = [1, 2, 3, 4] as const;
