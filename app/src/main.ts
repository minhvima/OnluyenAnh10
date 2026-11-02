import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/vietnamese-600.css';
import '@fontsource/baloo-2/vietnamese-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/vietnamese-400.css';
import '@fontsource/nunito/vietnamese-600.css';
import '@fontsource/nunito/vietnamese-700.css';
import '@fontsource/nunito/vietnamese-800.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/learn.css';
import './styles/phase.css';
import { clear, h } from './lib/dom';
import { fetchAccess, readAuthErrorFromUrl, supabase, type Role } from './lib/supabase';
import { shouldRerender } from './auth-events';
import { adminView } from './views/admin';
import { homeView } from './views/home';
import { leaveLesson, lessonView } from './views/lesson';
import { deniedView, loginView } from './views/login';
import { phaseView } from './views/phase';
import { leavePhaseTest, phaseTestView, topicTestView } from './views/phasetest';
import { topicView } from './views/topic';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');
const root: HTMLDivElement = app;

function shell(email: string, role: Role, content: HTMLElement): HTMLElement {
  const nav = h('nav', { class: 'topnav', 'aria-label': 'Chính' },
    h('a', { href: '#/' }, 'Ôn Ngữ pháp 10'),
    role === 'admin' ? h('a', { href: '#/admin' }, 'Quản trị') : null,
    h('span', { class: 'spacer' }),
    h('span', { class: 'who' }, email),
    h('button', { class: 'btn btn-small', onclick: () => void supabase?.auth.signOut() }, 'Đăng xuất'));
  return h('div', {}, nav, content);
}

let renderId = 0;
let shownForUserId: string | null = null; // who the current screen was built for

async function render(): Promise<void> {
  const mine = ++renderId;
  const stale = (): boolean => mine !== renderId; // a newer render started; drop this one
  leaveLesson();
  leavePhaseTest();
  clear(root);
  if (!supabase) { root.append(loginView(null)); return; }
  const { data } = await supabase.auth.getSession();
  if (stale()) return;
  const session = data.session;
  shownForUserId = session?.user.id ?? null;
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

  const email = session.user.email ?? '';
  const route = window.location.hash.replace(/^#\/?/, '');
  let content: HTMLElement;
  if (route === 'admin' && role === 'admin') content = adminView();
  else if (/^topic\/[^/]+\/test$/.test(route)) content = await topicTestView(decodeURIComponent(route.split('/')[1]), session.user.id);
  else if (route.startsWith('topic/')) content = await topicView(decodeURIComponent(route.slice(6)), session.user.id);
  else if (/^phase\/\d+\/test$/.test(route)) content = await phaseTestView(Number(route.split('/')[1]), session.user.id);
  else if (/^phase\/\d+$/.test(route)) content = await phaseView(Number(route.split('/')[1]), session.user.id);
  else if (route.startsWith('lesson/')) content = await lessonView(decodeURIComponent(route.slice(7)), session.user.id);
  else content = await homeView(email);
  if (stale()) return;
  root.append(shell(email, role, content));
  window.scrollTo(0, 0);
}

if (supabase) {
  // supabase-js emits SIGNED_IN again whenever the tab becomes visible; rebuilding then wiped a lesson in
  // progress. Rebuild only when the signed-in person actually changes (see auth-events.ts).
  supabase.auth.onAuthStateChange((event, session) => {
    if (shouldRerender(event, session?.user.id ?? null, shownForUserId)) void render();
  });
}
window.addEventListener('hashchange', () => void render());
void render();
