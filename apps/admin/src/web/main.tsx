// 화면 전체의 진입점. 로그인 여부를 먼저 가르고, 들어왔으면 띠 안에 화면 하나를 그린다
// 로그인하지 않은 채로 다른 화면 주소를 열면 로그인으로 보낸다 (SPEC §8.6)

import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { api, type ServiceRow, type User, 돌아갈자리를꺼낸다, 세션끊김을받는다 } from './api.js';
import { Authoring } from './Authoring.js';
import { API안내, ApiDocs } from './ApiDocs.js';
import { AuthoringDetail } from './AuthoringDetail.js';
import { CaseList } from './CaseList.js';
import { Dashboard } from './Dashboard.js';
import { 언어함, use말, type 언어 } from './i18n.js';
import { ItemDetail } from './ItemDetail.js';
import { use이동, 떠나기막기, 버리기전 } from './leaveGuard.js';
import {
  고른서비스,
  대시보드재료,
  배정서비스접두사,
  배정프로젝트들,
  프로젝트물을까,
  고른서비스를읽는다,
  고른서비스를적는다,
  고른언어를읽는다,
  고른언어를적는다,
  지금자리,
} from './layout.js';
import { Login } from './Login.js';
import { PasswordChange } from './PasswordChange.js';
import { PasswordNotice } from './PasswordNotice.js';
import { ProjectPick } from './ProjectPick.js';
import { Guide } from './Guide.js';
import { Prd } from './Prd.js';
import { 기능보나, 판정을만든다 } from './role.js';
import { route, 갈자리, 돌아갈자리, 주소의서비스, 집 } from './route.js';
import { RunList } from './RunList.js';
import { RunResult } from './RunResult.js';
import { RunWindow } from './RunWindow.js';
import { 고른밝기를건다 } from './theme.js';
import { PerfDevices } from './PerfDevices.js';
import { PerfPages } from './PerfPages.js';
import { PerfRun } from './PerfRun.js';
import { PerfRunList } from './PerfRunList.js';
import { PerfScenarioList } from './PerfScenarioList.js';
import { PerfWizard } from './PerfWizard.js';
import { ScenarioBuild } from './ScenarioBuild.js';
import { ScenarioWizard } from './ScenarioWizard.js';
import { ScenarioList } from './ScenarioList.js';
import { ScenarioRunList } from './ScenarioRunList.js';
import { Settings } from './Settings.js';
import { Shell } from './Shell.js';
import { Signup } from './Signup.js';
import { sso알림을단다, useSSO, 계정을기억한다, 로그아웃표시를단다, 로그아웃표시를뗀다, 막로그인표시를뗀다 } from './useSSO.js';
import { 칩움직임을건다 } from './motion.js';
import { Loading } from './ui.js';
import './styles.css';
import './authoringStatus.css';
import './decide.css';
import './noticeBar.css';
import './projectPick.css';
import './wizard.css';
import './scenarioWizard.css';
import './scenarioWizardEnd.css';
import './noticeDrawer.css';
import './drawer.css';
import './phone.css';
import './prd.css';
import './apidoc.css';
import './guide.css';
import './bts.css';
import './itemTrace.css';
import './runEvidence.css';
import './runList.css';
import './caseList.css';
import './casePick.css';
import './perf.css';
import './perfPages.css';
import './perfDevices.css';
import './perfRun.css';

function Screen({
  hash,
  service,
  user,
  onMeChanged,
  on비밀번호바뀜,
  on서비스번호,
}: {
  hash: string;
  service: ServiceRow | null;
  user: User;
  onMeChanged: () => void;
  on비밀번호바뀜: (user: User) => void;
  on서비스번호: (serviceId: number) => void;
}) {
  const t = use말();
  const current = route(hash);
  // maxihan 계정 설치는 비밀번호를 Auth_platform 이 가진다. 주소로 변경 화면을 열어도 없는 주소로 친다 (SPEC §8.6)
  const sso = useSSO();
  // 띠가 서비스를 고르기 전에는 목록을 부르지 않는다. 빈 값으로 부르면 서버가 400 을 낸다
  const prefix = service?.prefix ?? '';
  // 케이스·작성·실행 칸은 고른 서비스의 것을 본다 (화면공통 §8)
  const 할수 = 판정을만든다(user, service?.prefix ?? null);

  switch (current.name) {
    case 'dashboard':
      return <Dashboard 서비스열기={on서비스번호} {...대시보드재료(user, service?.prefix ?? null)} 열린서비스={service?.id ?? null} />;
    case 'cases':
      // 종류마다 새로 그린다 — 고른 것 · 쪽 · 검색어가 남으면 UI 와 기능을 섞어 골라 실행이 MIXED_KIND 로 거절된다 (PR #132)
      return (
        <CaseList
          key={`${current.kind}:${current.req ?? ''}`}
          kind={current.kind}
          service={prefix}
          할수={할수}
          결과보나={기능보나(user, service?.prefix ?? null, 'runs')}
          요구보나={기능보나(user, service?.prefix ?? null, 'authoring')}
          요구={current.req}
          앱종류={service?.kind}
        />
      );
    case 'setup':
      // 옛 주소 — 한 건짜리 실행 설정 화면은 실행 창으로 합쳤다(2026-10-09). 북마크 · 지난 알림으로 와도 같은 창을 연다
      return <RunWindow tcIds={[current.tcId]} onClose={() => { window.location.hash = '#/cases'; }} on걸림={() => undefined} />;
    case 'prd':
      // 서비스마다 새로 그린다 — 앞 서비스에서 고른 확인 필요 · 펼친 줄 · 고치던 칸이 남으면 다른 서비스의 판에 보낸다
      return (
        <Prd
          key={`${prefix}:${current.reqId ?? ''}`}
          service={prefix}
          할수={할수}
          여기={current.reqId}
          결과보나={기능보나(user, service?.prefix ?? null, 'runs')}
          케이스보나={기능보나(user, service?.prefix ?? null, 'cases')}
        />
      );
    case 'prdGuide':
      // 서비스마다 새로 그린다 — 앞 서비스에서 고치던 글이 남으면 다른 서비스의 가이드에 저장된다
      return <Guide key={prefix} service={prefix} 할수={할수} />;
    case 'apiDocs':
      // 애플리케이션마다 새로 그린다 — 앞 애플리케이션의 버전 기록 · 펼친 줄이 남지 않게
      return service === undefined || service === null ? <API안내 설정보나={할수('설정')} /> : <ApiDocs key={`${prefix}:${String(current.version ?? '')}`} service={service} 할수={할수} 버전={current.version} 설정보나={할수('설정')} />;
    case 'authoring':
      return <Authoring service={prefix} serviceId={service?.id} envs={service?.envs ?? []} 피그마토큰={service?.hasFigmaToken !== false} 앱종류={service?.kind} 할수={할수} />;
    case 'authoringItem':
      // 번호마다 새로 그린다 — 요청 사이를 오갈 때(남은 요구 · 원본 고리) 앞 요청의 답과 버튼 상태가 남으면
      // 주소는 새 번호인데 앞 요청 화면이 보이고 다시 누를 수 있다 (2026-09-30 코드 검토)
      return (
        <AuthoringDetail key={current.id} service={prefix} id={current.id} 할수={할수} 서비스번호={service?.id} 배정번호들={user.services.map((s) => s.id)} on서비스번호={on서비스번호} />
      );
    case 'runs':
      // E2E 는 시나리오 실행만 모으는 별도 화면이다 — 줄 모양과 거르개가 UI · 기능 목록과 다르다
      // 결과 칸은 `?run=` 의 실행 서비스로 버튼을 가른다 — 주소의 실행이 띠와 다른 서비스일 수 있다(항목 상세의 「실행 결과」 고리)
      if (current.kind === 'E2E') return <ScenarioRunList key="E2E" service={prefix} 판정하기={(접두사) => 판정을만든다(user, 접두사)} />;
      return (
        <RunList
          key={current.kind}
          kind={current.kind}
          service={prefix}
          envs={service?.envs ?? []}
          판정하기={(접두사) => 판정을만든다(user, 접두사)}
          서비스바꿈={(접두사) => {
            const 번호 = user.services.find((서비스) => 서비스.prefix === 접두사)?.id;
            if (번호 !== undefined) on서비스번호(번호);
          }}
        />
      );
    case 'scenarios':
      // 서비스를 바꾸면 새로 그린다 — 고른 대상 서버와 앞 서비스의 실행 안내가 남으면 다른 서비스에 쏜다
      return <ScenarioList key={prefix} service={prefix} kind={service?.kind} envs={service?.envs ?? []} 할수={할수} />;
    case 'scenarioNew':
      // 마법사도 서비스로 key 를 걸지 않는다 — 열 때 고른 애플리케이션이 시나리오 서비스다
      return <ScenarioWizard key="new" 띠서비스={service} user={user} />;
    case 'scenarioNewBuild':
      // 서비스로 key 를 걸지 않는다 — 조립 중 띠를 바꿔도 초안이 그대로여야 한다. 서비스는 훅이 처음 받은 것으로 고정한다
      return <ScenarioBuild key="new" id={null} 띠서비스={service} user={user} />;
    case 'scenario':
      return <ScenarioBuild key={current.id} id={current.id} 띠서비스={service} user={user} />;
    case 'perfScenarios':
      return service === null ? <div className="empty">{t('애플리케이션을 먼저 골라 주세요')}</div> : <PerfScenarioList key={prefix} serviceId={service.id} 할수={할수} />;
    case 'perfScenarioNew':
      return <PerfWizard key="new" id={null} 띠서비스={service} user={user} />;
    case 'perfScenario':
      return <PerfWizard key={current.id} id={current.id} 띠서비스={service} user={user} />;
    case 'perfPages':
      // 애플리케이션 · 실행마다 새로 그린다 — 앞 애플리케이션의 측정 조건 · 고른 페이지가 남아 다른 애플리케이션에 쏘지 않게
      return service === null ? <div className="empty">{t('애플리케이션을 먼저 골라 주세요')}</div> : <PerfPages key={`${prefix}:${String(current.run ?? '')}`} service={service} run={current.run} 쓰나={할수('실행')} />;
    case 'perfDevices':
      // 페이지 성능과 같다 — 애플리케이션 · 실행마다 새로 그려 앞 애플리케이션의 고른 기기 · 케이스가 남지 않게
      return service === null ? <div className="empty">{t('애플리케이션을 먼저 골라 주세요')}</div> : <PerfDevices key={`${prefix}:${String(current.run ?? '')}`} service={service} run={current.run} 쓰나={할수('실행')} />;
    case 'perfRuns':
      return service === null ? <div className="empty">{t('애플리케이션을 먼저 골라 주세요')}</div> : <PerfRunList key={prefix} serviceId={service.id} />;
    case 'perfRun':
      // 번호마다 새로 그린다 — 다시 실행으로 새 번호 주소로 오면 앞 실행의 숫자가 남지 않게
      return <PerfRun key={current.runId} runId={current.runId} 판정하기={(접두사) => 판정을만든다(user, 접두사)} />;
    case 'run':
      // 주소로 바로 오는 화면이라 띠와 다른 서비스의 실행일 수 있다 — 그 실행의 칸으로 가른다
      return <RunResult runId={current.runId} 판정하기={(접두사) => 판정을만든다(user, 접두사)} />;
    case 'item':
      return <ItemDetail runId={current.runId} historyId={current.historyId} 판정하기={(접두사) => 판정을만든다(user, 접두사)} />;
    case 'login':
    case 'signup':
      // 로그인했는데 주소가 로그인 화면이다. 위 useEffect 가 집으로 보내는 한 프레임 동안
      // '없는 주소입니다' 가 깜빡이지 않게 빈 화면을 낸다
      return <div className="screen" />;
    case 'settings':
      return <Settings user={user} onMeChanged={onMeChanged} 자리={current.자리} on서비스번호={on서비스번호} />;
    case 'password':
      if (sso === true) break;
      return (
        <PasswordChange
          강제={false}
          onDone={on비밀번호바뀜}
          onCancel={() => {
            window.location.hash = 집(user, service?.prefix ?? null);
          }}
        />
      );
  }
  return (
    <div className="screen">
      <div className="empty">
        {t('없는 주소입니다.')} <a href={집(user, service?.prefix ?? null)}>{t('처음으로')}</a>
      </div>
    </div>
  );
}

type 상태 = { 어디: '묻는중' } | { 어디: '밖' } | { 어디: '안'; user: User };

function App({ 언어, on언어 }: { 언어: 언어; on언어: (고른: 언어) => void }) {
  const { hash, 조건번 } = use이동();
  const [상태, set상태] = useState<상태>({ 어디: '묻는중' });
  // 로그인한 직후에만 프로젝트를 먼저 묻는다. 새로고침이나 끊겼다 돌아온 로그인은 보던 프로젝트 그대로다
  const [프로젝트묻기, set프로젝트묻기] = useState(false);
  const [prefix, setPrefix] = useState<string | null>(() => 고른서비스를읽는다());
  // 스스로 비밀번호를 바꾼 뒤 돌아갈 자리. 들어가는 화면들은 기억하지 않는다 — 거기로 돌아가면 쓸 데가 없다
  const 직전 = useRef('');
  // 스스로 바꾼 직후에만 돌아간 자리에서 확인 한 줄을 보인다. 강제로 바꾼 사람은 집으로 가며 그 줄이 없다
  const [비밀번호바꿈, set비밀번호바꿈] = useState(false);
  const 알림끄기 = useCallback(() => set비밀번호바꿈(false), []);
  const sso = useSSO();
  useEffect(() => {
    if (!['password', 'login', 'signup'].includes(route(hash).name)) 직전.current = hash;
  }, [hash]);

  // 새로고침해도 로그인 상태가 이어진다. 세션은 브라우저가 들고 다닌다 (SPEC §3.5)
  // 처음 열 때의 401 은 사고가 아니다. 서버가 안 뜬 것이든 로그인이 안 된 것이든
  // 사람이 할 수 있는 일은 로그인뿐이라 갈래를 나누지 않는다
  // 막 로그인한 사람 — 비밀번호 로그인(Login 의 onLogin)과 maxihan 계정 왕복(아래 ?sso=ok)이 같이 쓴다
  const 들어왔다 = (user: User) => {
    set상태({ 어디: '안', user });
    // 세션이 끊겨 로그인한 사람은 원래 가려던 화면으로 돌려보낸다 (SPEC §8.6).
    // 기억해 둔 자리도 권한 판정을 탄다 — 그사이 칸이 none 이 됐을 수 있다
    const 돌아감 = 돌아갈자리를꺼낸다();
    const 목적지 = 돌아감 ?? window.location.hash;
    // 요구 번호 주소는 그 번호의 서비스로 연다(아래 띠 맞추기) — 권한도 그 서비스로 봐야 앞 띠의 칸으로 집에 돌려보내지 않는다
    const 고른 = 주소의서비스(목적지, user.services) ?? 고른서비스(prefix, user.services)?.prefix ?? null;
    set프로젝트묻기(프로젝트물을까(돌아감, user.services));
    window.location.hash = 돌아갈자리(목적지, user, 고른);
  };

  useEffect(() => {
    const 막로그인 = 막로그인표시를뗀다();
    api
      .me()
      .then(({ user }) => {
        // 들어와 있으면 로그아웃 표시는 낡았다 — 카드를 거치지 않고 들어온 길(바로 연 sso/start 등)도 있다.
        // 계정은 막 로그인할 때만이 아니라 열 때마다 적는다 — 기억이 생기기 전부터 들어와 있던 사람도 카드에 그 계정이 나온다 (도메인/인증 §8.6 「로그인 카드」)
        로그아웃표시를뗀다();
        계정을기억한다({ username: user.username, name: user.displayName });
        if (막로그인) 들어왔다(user);
        else set상태({ 어디: '안', user });
      })
      .catch(() => {
        if (막로그인) sso알림을단다('failed');
        set상태({ 어디: '밖' });
      });
    // 처음 열 때 한 번만 묻는다
  }, []);

  // 도중에 세션이 끊기면 api.ts 가 여기로 알린다.
  // **주소만 바뀌는 것으로는 부족하다** — 아래 「로그인했는데 주소가 로그인 화면」 갈래가
  // 곧장 집으로 되돌려 버려서 로그인 화면이 끝내 안 뜬다
  useEffect(() => {
    세션끊김을받는다(() => {
      // 로그인 화면으로 가는 길을 저장 안 한 조립이 막으면 안 된다
      떠나기막기(null);
      set상태({ 어디: '밖' });
    });
  }, []);

  // 요구 번호 주소(`#/prd/MKT-REQ-001`) · 결정 필요 주소(`#/authoring?todo=1&service=MKT`)로 오면 띠를 그 서비스로 맞춘다 — 그리기 전에 바꿔야 아래 집으로 보내기가 앞 띠 서비스의 칸으로 가르지 않는다.
  // 주소가 바뀔 때 한 번만 맞춘다. 그 주소에 머문 채 띠 고르개로 고른 서비스를 되돌리지 않는다
  const [맞춘주소, set맞춘주소] = useState<string | null>(null);
  if (상태.어디 === '안' && 맞춘주소 !== hash) {
    set맞춘주소(hash);
    const 주소것 = 주소의서비스(hash, 상태.user.services);
    if (주소것 !== null && 주소것 !== prefix) setPrefix(주소것);
  }

  // 저장된 서비스가 배정에서 빠졌거나 주소가 서비스를 골랐으면 실제로 연 것을 적어 둔다.
  // 렌더 안에서 쓰면 매 렌더마다 다시 쓴다
  const 열린것 = 상태.어디 === '안' ? 고른서비스(prefix, 상태.user.services) : null;
  const 열린접두사 = 열린것?.prefix ?? null;
  useEffect(() => {
    if (열린접두사 === null) return;
    고른서비스를적는다(열린접두사);
    if (열린접두사 !== prefix) setPrefix(열린접두사);
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
        on언어={on언어}
        onLogin={들어왔다}
      />
    );
  }

  const 나간다 = () => {
    const 정리 = () => {
      // 로그인 화면으로 가는 길을 저장 안 한 조립이 막으면 안 된다
      떠나기막기(null);
      set상태({ 어디: '밖' });
      set프로젝트묻기(false);
      // 알림이 뜬 채 나가면 줄이 사라져 끄는 길(onGone)이 안 불린다. 남겨 두면 다음 로그인에 옛 알림이 뜬다
      set비밀번호바꿈(false);
      // SSO 로그아웃은 Auth_platform 세션을 남긴다(도메인/인증 §8.6). 표시 없이 두면 로그인 화면이 바로 보내고 그 세션이 곧장 다시 들여보낸다.
      // 주소의 알림은 이 탭, 브라우저의 표시는 새 탭 · 북마크 몫이다
      if (sso === true) {
        로그아웃표시를단다();
        sso알림을단다('out');
      }
      window.location.hash = '#/login';
    };
    void api.logout().then(정리, 정리);
  };

  // 바뀐 나를 받아 강제면 집으로, 스스로면 직전 자리로 (도메인/인증 §8.6). 세션은 그대로다
  const 비밀번호바뀜 = (user: User, 강제: boolean) => {
    set상태({ 어디: '안', user });
    set비밀번호바꿈(!강제);
    const 고른 = 고른서비스(prefix, user.services)?.prefix ?? null;
    window.location.hash = 강제 ? 집(user, 고른) : 돌아갈자리(직전.current, user, 고른);
  };

  // 변경 강제 중이면 이 화면만 — 사이드바·서비스 고르개가 없다. 서버도 다른 API 를 403 으로 막는다
  if (상태.user.mustChangePassword) {
    return <PasswordChange 강제 onDone={(user) => 비밀번호바뀜(user, true)} onLogout={나간다} />;
  }

  if (프로젝트묻기 && 배정프로젝트들(상태.user.services).length > 1) {
    return (
      <ProjectPick
        user={상태.user}
        // 한 번도 안 열어 본 브라우저는 마지막이 없다 — 첫 애플리케이션으로 열려도 「마지막에 연」 표시는 달지 않는다
        마지막={상태.user.services.find((it) => it.prefix === prefix) ?? null}
        onPick={(접두사) => {
          고른서비스를적는다(접두사);
          setPrefix(접두사);
          set프로젝트묻기(false);
        }}
        onLogout={나간다}
      />
    );
  }

  return (
    <Shell
      user={상태.user}
      service={열린것}
      onService={(접두사) => {
        // 고르개는 고른 서비스를 먼저 적어 둔다. 쓰던 글이 있어 떠나기 상자가 막으면 묻던 서비스가 남아야 새로고침이 그리로 연다
        if (열린접두사 !== null) 고른서비스를적는다(열린접두사);
        버리기전(() => {
          고른서비스를적는다(접두사);
          setPrefix(접두사);
          // 다른 서비스의 요구 번호가 주소에 남으면 새로고침 · 뒤로 가기가 그 서비스로 띠를 되돌린다 — 번호를 떼고 목록 자리로 바꿔 둔다
          const 주소것 = 주소의서비스(window.location.hash, 상태.user.services);
          if (주소것 !== null && 주소것 !== 접두사) window.location.replace('#/prd');
        });
      }}
      언어={언어}
      on언어={on언어}
      onLogout={나간다}
      current={(() => {
        const 지금 = route(hash);
        return 지금자리(지금.name, 집(상태.user, 열린접두사), 'kind' in 지금 ? 지금.kind : undefined);
      })()}
    >
      {비밀번호바꿈 ? <PasswordNotice onGone={알림끄기} /> : null}
      <Screen
        // 조건 붙은 주소로 오면 새로 그린다 — 목록은 조건을 그릴 때 한 번만 읽어 「RUN N에서 통과」 고리를 눌러도 앞 실행에 남았다
        key={조건번}
        hash={hash}
        service={열린것}
        user={상태.user}
        on비밀번호바뀜={(user) => 비밀번호바뀜(user, false)}
        // 사이드바 고르개와 같은 길이다 — 대시보드에서 다른 서비스의 작성 요청을 열 때 쓴다
        on서비스번호={(번호) => {
          const 접두사 = 배정서비스접두사(번호, 상태.user.services);
          if (접두사 === null) return;
          고른서비스를적는다(접두사);
          setPrefix(접두사);
        }}
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

고른밝기를건다();
칩움직임을건다();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <뿌리 />
  </StrictMode>,
);
