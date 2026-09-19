// 화면 전체의 진입점. 로그인 여부를 먼저 가르고, 들어왔으면 띠 안에 화면 하나를 그린다
// 로그인하지 않은 채로 다른 화면 주소를 열면 로그인으로 보낸다 (SPEC §8.6)

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { api, type ServiceRow, type User, 돌아갈자리를꺼낸다, 세션끊김을받는다 } from './api.js';
import { CaseList } from './CaseList.js';
import { ItemDetail } from './ItemDetail.js';
import { 고른서비스, 고른서비스를읽는다, 고른서비스를적는다 } from './layout.js';
import { Login } from './Login.js';
import { route, 돌아갈자리, type Route } from './route.js';
import { RunList } from './RunList.js';
import { RunResult } from './RunResult.js';
import { RunSetup } from './RunSetup.js';
import { Settings } from './Settings.js';
import { Shell } from './Shell.js';
import './styles.css';

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function Screen({ hash, service, user }: { hash: string; service: ServiceRow | null; user: User }) {
  const current = route(hash);
  // 띠가 서비스를 고르기 전에는 목록을 부르지 않는다. 빈 값으로 부르면 서버가 400 을 낸다
  const prefix = service?.prefix ?? '';

  switch (current.name) {
    case 'cases':
      return <CaseList service={prefix} />;
    case 'setup':
      return <RunSetup tcId={current.tcId} service={service} user={user} />;
    case 'runs':
      return <RunList service={prefix} />;
    case 'run':
      return <RunResult runId={current.runId} role={user.role} />;
    case 'item':
      return <ItemDetail runId={current.runId} historyId={current.historyId} />;
    case 'login':
      // 로그인했는데 주소가 로그인 화면이다. 위 useEffect 가 집으로 보내는 한 프레임 동안
      // '없는 주소입니다' 가 깜빡이지 않게 빈 화면을 낸다
      return <div className="screen" />;
    case 'settings':
      return <Settings role={user.role} />;
    default:
      return (
        <div className="screen">
          <div className="empty">
            없는 주소입니다. <a href="#/cases">케이스 목록으로</a>
          </div>
        </div>
      );
  }
}

type 상태 = { 어디: '묻는중' } | { 어디: '밖' } | { 어디: '안'; user: User };

/** 실행 결과와 항목 상세는 실행 기록에서 들어온 자리다. 밑줄이 케이스에 가면 안 된다 */
function 지금자리(name: Route['name']): string {
  if (name === 'runs' || name === 'run' || name === 'item') return '#/runs';
  if (name === 'settings') return '#/settings';
  return '#/cases';
}

function App() {
  const hash = useHash();
  const [상태, set상태] = useState<상태>({ 어디: '묻는중' });
  const [prefix, setPrefix] = useState<string | null>(() => 고른서비스를읽는다());

  // 새로고침해도 로그인 상태가 이어진다. 세션은 브라우저가 들고 다닌다 (SPEC §3.5)
  // 처음 열 때의 401 은 사고가 아니다. 서버가 안 뜬 것이든 로그인이 안 된 것이든
  // 사람이 할 수 있는 일은 로그인뿐이라 갈래를 나누지 않는다
  useEffect(() => {
    api
      .me()
      .then(({ user }) => set상태({ 어디: '안', user }))
      .catch(() => set상태({ 어디: '밖' }));
  }, []);

  // 도중에 세션이 끊기면 api.ts 가 여기로 알린다.
  // **주소만 바뀌는 것으로는 부족하다** — 아래 「로그인했는데 주소가 로그인 화면」 갈래가
  // 곧장 집으로 되돌려 버려서 로그인 화면이 끝내 안 뜬다
  useEffect(() => {
    세션끊김을받는다(() => set상태({ 어디: '밖' }));
  }, []);

  // 저장된 서비스가 배정에서 빠졌으면 실제로 연 것을 적어 둔다.
  // 렌더 안에서 쓰면 매 렌더마다 다시 쓴다
  const 열린것 = 상태.어디 === '안' ? 고른서비스(prefix, 상태.user.services) : null;
  const 열린접두사 = 열린것?.prefix ?? null;
  useEffect(() => {
    if (열린접두사 !== null && 열린접두사 !== prefix) {
      고른서비스를적는다(열린접두사);
      setPrefix(열린접두사);
    }
  }, [열린접두사, prefix]);

  // 로그인은 했는데 주소가 로그인 화면이면 집으로 보낸다.
  // 렌더 중에 주소를 바꾸면 React 가 그리는 도중에 부수효과가 난다
  const 로그인화면인가 = route(hash).name === 'login';
  const 들어왔나 = 상태.어디 === '안';
  useEffect(() => {
    if (들어왔나 && 로그인화면인가) window.location.hash = '#/cases';
  }, [들어왔나, 로그인화면인가]);

  if (상태.어디 === '묻는중') {
    return (
      <div className="screen">
        <div className="empty">불러오는 중입니다.</div>
      </div>
    );
  }

  if (상태.어디 === '밖') {
    return (
      <Login
        onLogin={(user) => {
          set상태({ 어디: '안', user });
          // 세션이 끊겨 여기로 온 사람은 원래 가려던 화면으로 돌려보낸다 (SPEC §8.6)
          window.location.hash = 돌아갈자리를꺼낸다() ?? 돌아갈자리(window.location.hash);
        }}
      />
    );
  }

  return (
    <Shell
      user={상태.user}
      service={열린것}
      onService={setPrefix}
      onLogout={() => {
        void api.logout().finally(() => {
          set상태({ 어디: '밖' });
          window.location.hash = '#/login';
        });
      }}
      current={지금자리(route(hash).name)}
    >
      <Screen hash={hash} service={열린것} user={상태.user} />
    </Shell>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
