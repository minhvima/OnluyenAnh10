import { h } from '../lib/dom';
import { configured, supabase } from '../lib/supabase';

export function loginView(message: string | null): HTMLElement {
  const note = h('p', { class: 'note', role: 'status' }, message);
  const btn = h(
    'button',
    {
      class: 'btn btn-primary',
      onclick: async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + window.location.pathname },
        });
        if (error) note.textContent = 'Không thể mở trang đăng nhập Google. Thử lại sau nhé.';
      },
    },
    'Đăng nhập bằng Google',
  );
  return h(
    'main',
    { class: 'center-card' },
    h('h1', {}, 'Ôn Ngữ pháp vào 10'),
    h('p', {}, 'Học từng chủ điểm, làm bài và xem lời giải ngay.'),
    configured ? btn : h('p', { class: 'note' }, 'Ứng dụng chưa được cấu hình kết nối (thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).'),
    note,
  );
}

export function deniedView(email: string | undefined): HTMLElement {
  return h(
    'main',
    { class: 'center-card' },
    h('h1', {}, 'Chưa được cấp quyền'),
    h('p', {}, `Tài khoản ${email ?? ''} chưa nằm trong danh sách được phép. Hãy nhờ phụ huynh thêm email này, rồi đăng nhập lại.`),
    h('button', { class: 'btn', onclick: () => void supabase?.auth.signOut() }, 'Đăng xuất'),
  );
}
