import './styles/tokens.css';
import './styles/app.css';
import { clear, h } from './lib/dom';
import { fetchAccess, readAuthErrorFromUrl, supabase, type Role } from './lib/supabase';
import { adminView } from './views/admin';
import { homeView } from './views/home';
import { deniedView, loginView } from './views/login';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');
const root: HTMLDivElement = app;

function shell(email: string, role: Role, content: HTMLElement): HTMLElement {
  const nav = h('nav', { class: 'topnav', 'aria-label': 'Chính' },
    h('a', { href: '#/' }, 'Trang chủ'),
    role === 'admin' ? h('a', { href: '#/admin' }, 'Quản trị') : null,
    h('span', { class: 'spacer' }),
    h('span', { class: 'who' }, email),
    h('button', { class: 'btn btn-small', onclick: () => void supabase?.auth.signOut() }, 'Đăng xuất'));
  return h('div', {}, nav, content);
}

let renderId = 0;

async function render(): Promise<void> {
  const mine = ++renderId;
  const stale = (): boolean => mine !== renderId; // a newer render started; drop this one
  clear(root);
  if (!supabase) { root.append(loginView(null)); return; }
  const { data } = await supabase.auth.getSession();
  if (stale()) return;
  const session = data.session;
  if (!session) {
    const err = readAuthErrorFromUrl();
    root.append(loginView(err ? 'Email này chưa được phép đăng ký. Hãy nhờ phụ huynh thêm email vào danh sách.' : null));
    return;
  }
  let role: Role | null = null;
  try {
    role = await fetchAccess(supabase);
  } catch {
    if (stale()) return;
    root.append(h('main', { class: 'center-card' }, h('p', { class: 'error', role: 'alert' }, 'Không kiểm tra được quyền truy cập. Tải lại trang nhé.')));
    return;
  }
  if (stale()) return;
  if (!role) { root.append(deniedView(session.user.email)); return; }
  const route = window.location.hash;
  const content = route === '#/admin' && role === 'admin' ? adminView() : await homeView();
  if (stale()) return;
  root.append(shell(session.user.email ?? '', role, content));
}

if (supabase) supabase.auth.onAuthStateChange(() => void render());
window.addEventListener('hashchange', () => void render());
void render();
