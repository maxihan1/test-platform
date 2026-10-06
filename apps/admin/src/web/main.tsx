// 화면 전체의 진입점. 로그인 여부를 먼저 가르고, 들어왔으면 띠 안에 화면 하나를 그린다
// 로그인하지 않은 채로 다른 화면 주소를 열면 로그인으로 보낸다 (SPEC §8.6)

import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { api, type ServiceRow, type User, 돌아갈자리를꺼낸다, 세션끊김을받는다 } from './api.js';
import { Authoring } from './Authoring.js';
import { AuthoringDetail } from './AuthoringDetail.js';
import { CaseList } from './CaseList.js';
import { 언어함, use말, type 언어 } from './i18n.js';
import { ItemDetail } from './ItemDetail.js';
import {
  고른서비스,
  고른서비스를읽는다,
  고른서비스를적는다,
  고른언어를읽는다,
  고른언어를적는다,
  지금자리,
} from './layout.js';
import { Login } from './Login.js';
import { PasswordChange } from './PasswordChange.js';
import { 기능보나, 판정을만든다 } from './role.js';
import { route, 갈자리, 돌아갈자리, 집 } from './route.js';
import { RunList } from './RunList.js';
import { RunResult } from './RunResult.js';
import { RunSetup } from './RunSetup.js';
import { Settings } from './Settings.js';
import { Shell } from './Shell.js';
import { Signup } from './Signup.js';
import { Loading } from './ui.js';
import './styles.css';
import './authoringStatus.css';

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function Screen({
  hash,
  service,
  user,
  onMeChanged,
  on비밀번호바뀜,
}: {
  hash: string;
  service: ServiceRow | null;
  user: User;
  onMeChanged: () => void;
  on비밀번호바뀜: (user: User) => void;
}) {
  const t = use말();
  const current = route(hash);
  // 띠가 서비스를 고르기 전에는 목록을 부르지 않는다. 빈 값으로 부르면 서버가 400 을 낸다
  const prefix = service?.prefix ?? '';
  // 케이스·작성·실행 칸은 고른 서비스의 것을 본다 (화면공통 §8)
  const 할수 = 판정을만든다(user, service?.prefix ?? null);

  switch (current.name) {
    case 'cases':
      // 종류마다 새로 그린다 — 고른 것 · 쪽 · 검색어가 남으면 UI 와 기능을 섞어 골라 실행이 MIXED_KIND 로 거절된다 (PR #132)
      return (
        <CaseList
          key={current.kind}
          kind={current.kind}
          service={prefix}
          할수={할수}
          결과보나={기능보나(user, service?.prefix ?? null, 'runs')}
        />
      );
    case 'setup':
      return <RunSetup tcId={current.tcId} service={service} user={user} />;
    case 'authoring':
      return <Authoring service={prefix} envs={service?.envs ?? []} 할수={할수} />;
    case 'authoringItem':
      // 번호마다 새로 그린다 — 요청 사이를 오갈 때(남은 요구 · 원본 고리) 앞 요청의 답과 버튼 상태가 남으면
      // 주소는 새 번호인데 앞 요청 화면이 보이고 다시 누를 수 있다 (2026-09-30 코드 검토)
      return <AuthoringDetail key={current.id} service={prefix} id={current.id} 할수={할수} />;
    case 'runs':
      // E2E 하위 화면은 계획 할 일 8 이 잇는다 — 그 전까지 케이스 목록에 E2E 이름표를 붙여 보이지 않게 빈 화면
      if (current.kind === 'E2E') return <div className="screen" />;
      return <RunList key={current.kind} kind={current.kind} service={prefix} 할수={할수} />;
    case 'run':
      // 주소로 바로 오는 화면이라 띠와 다른 서비스의 실행일 수 있다 — 그 실행의 칸으로 가른다
      return <RunResult runId={current.runId} 판정하기={(접두사) => 판정을만든다(user, 접두사)} />;
    case 'item':
      return <ItemDetail runId={current.runId} historyId={current.historyId} />;
    case 'login':
    case 'signup':
      // 로그인했는데 주소가 로그인 화면이다. 위 useEffect 가 집으로 보내는 한 프레임 동안
      // '없는 주소입니다' 가 깜빡이지 않게 빈 화면을 낸다
      return <div className="screen" />;
    case 'settings':
      return <Settings user={user} onMeChanged={onMeChanged} />;
    case 'password':
      return <PasswordChange 강제={false} onDone={on비밀번호바뀜} />;
    default:
      return (
        <div className="screen">
          <div className="empty">
            {t('없는 주소입니다.')} <a href="#/cases">{t('케이스 목록으로')}</a>
          </div>
        </div>
      );
  }
}

type 상태 = { 어디: '묻는중' } | { 어디: '밖' } | { 어디: '안'; user: User };

function App({ 언어, on언어 }: { 언어: 언어; on언어: (고른: 언어) => void }) {
  const hash = useHash();
  const [상태, set상태] = useState<상태>({ 어디: '묻는중' });
  const [prefix, setPrefix] = useState<string | null>(() => 고른서비스를읽는다());
  // 스스로 비밀번호를 바꾼 뒤 돌아갈 자리. 들어가는 화면들은 기억하지 않는다 — 거기로 돌아가면 쓸 데가 없다
  const 직전 = useRef('');
  useEffect(() => {
    if (!['password', 'login', 'signup'].includes(route(hash).name)) 직전.current = hash;
  }, [hash]);

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
  // `none` 인 자리 주소를 직접 쳐도 집으로 보낸다 — 집은 권한으로 고른 맨 위 자리다 (화면공통 §8)
  // 가입 화면도 로그인한 사람에게는 쓸 데가 없어 집으로 보낸다
  const 들어가는자리 = route(hash).name === 'login' || route(hash).name === 'signup';
  const 보낼곳 =
    상태.어디 !== '안' ? null : 들어가는자리 ? 집(상태.user, 열린접두사) : 갈자리(hash, 상태.user, 열린접두사);
  useEffect(() => {
    if (보낼곳 !== null && 보낼곳 !== hash) window.location.hash = 보낼곳;
  }, [보낼곳, hash]);

  if (상태.어디 === '묻는중') {
    return (
      <div className="screen">
        <Loading />
      </div>
    );
  }

  // 가입은 로그인 없이 여는 유일한 다른 화면이다 (도메인/인증 §8.6)
  if (상태.어디 === '밖' && route(hash).name === 'signup') return <Signup />;

  if (상태.어디 === '밖') {
    return (
      <Login
        onLogin={(user) => {
          set상태({ 어디: '안', user });
          // 세션이 끊겨 여기로 온 사람은 원래 가려던 화면으로 돌려보낸다 (SPEC §8.6).
          // 기억해 둔 자리도 권한 판정을 탄다 — 그사이 칸이 none 이 됐을 수 있다
          const 고른 = 고른서비스(prefix, user.services)?.prefix ?? null;
          window.location.hash = 돌아갈자리(돌아갈자리를꺼낸다() ?? window.location.hash, user, 고른);
        }}
      />
    );
  }

  const 나간다 = () => {
    void api.logout().finally(() => {
      set상태({ 어디: '밖' });
      window.location.hash = '#/login';
    });
  };

  // 바뀐 나를 받아 강제면 집으로, 스스로면 직전 자리로 (도메인/인증 §8.6). 세션은 그대로다
  const 비밀번호바뀜 = (user: User, 강제: boolean) => {
    set상태({ 어디: '안', user });
    const 고른 = 고른서비스(prefix, user.services)?.prefix ?? null;
    window.location.hash = 강제 ? 집(user, 고른) : 돌아갈자리(직전.current, user, 고른);
  };

  // 변경 강제 중이면 이 화면만 — 사이드바·서비스 고르개가 없다. 서버도 다른 API 를 403 으로 막는다
  if (상태.user.mustChangePassword) {
    return <PasswordChange 강제 onDone={(user) => 비밀번호바뀜(user, true)} onLogout={나간다} />;
  }

  return (
    <Shell
      user={상태.user}
      service={열린것}
      onService={setPrefix}
      언어={언어}
      on언어={on언어}
      onLogout={나간다}
      current={(() => {
        const 지금 = route(hash);
        return 지금자리(지금.name, 집(상태.user, 열린접두사), 'kind' in 지금 ? 지금.kind : undefined);
      })()}
    >
      <Screen
        hash={hash}
        service={열린것}
        user={상태.user}
        on비밀번호바뀜={(user) => 비밀번호바뀜(user, false)}
        onMeChanged={() => {
          // 설정 화면이 /auth/me 의 재료를 고쳤다 — 계정의 배정·등급이든 서비스의 이름·색·
          // 대상 서버·Slack 웹훅이든. 그 응답 하나가 띠·자리·실행 설정을 다 그린다.
          // 여기서 안 읽으면 새로고침할 때까지 옛 값을 보고, 시킨 대로 한 사람은
          // 자기가 한 일이 먹혔는지 알 수 없다
          // 실패해도 화면을 끌어내리지 않는다 — 방금 저장은 이미 됐다.
          // 다만 조용히 삼키지도 않는다. 콘솔에 남겨 둬야 왜 띠가 안 바뀌었는지 찾을 수 있다
          void api
            .me()
            .then(({ user }) => set상태({ 어디: '안', user }))
            .catch((err: unknown) => {
              console.error('[설정] 고친 뒤 /auth/me 를 다시 읽지 못했다. 새로고침하면 맞다', err);
            });
        }}
      />
    </Shell>
  );
}

/**
 * 화면 언어를 들고 아래 전부에 내려 준다 (SPEC §8 「다국어」).
 *
 * **껍데기 바깥(로그인 화면)도 덮어야 해서 `App` 보다 위에 있다.**
 * `App` 안에 두면 로그인 화면이 provider 밖으로 나가 거기서만 한국어가 된다.
 */
function 뿌리() {
  const [언어, set언어] = useState<언어>(고른언어를읽는다);

  // 화면 낭독기가 목소리를 이 값으로 고른다. 틀리면 한국어 목소리로 영어를 읽는다
  useEffect(() => {
    document.documentElement.lang = 언어;
  }, [언어]);

  return (
    <언어함 value={언어}>
      <App
        언어={언어}
        on언어={(고른) => {
          set언어(고른);
          고른언어를적는다(고른);
        }}
      />
    </언어함>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <뿌리 />
  </StrictMode>,
);
