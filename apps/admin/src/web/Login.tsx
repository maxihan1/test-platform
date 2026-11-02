// 로그인 화면 (SPEC §8.6). 아이디 칸, 비밀번호 칸, 로그인 버튼, 그 아래 회원가입 링크, 언어 고르개. 그 밖에 아무것도 없다
// maxihan 계정(SSO)이 켜진 설치는 화면 없이 바로 Auth_platform 으로 보내고, 돌아온 알림 · 로그아웃 표시가 있을 때만 카드를 그린다 (SSO로그인)
// 가입은 승인 대기 계정만 만든다 — 문을 여는 판단은 여전히 운영자가 설정 화면에서 한다 (§8.8)

import { useEffect, useRef, useState } from 'react';

import { api, ApiError, type User } from './api.js';
import { use말, use언어, type 언어 } from './i18n.js';
import { 언어고르개 } from './ShellPickers.js';
import { message } from './ui.js';
import { useSSO, 기억한계정을읽는다, 기억한계정을지운다, 로그아웃표시를뗀다, 로그아웃했나 } from './useSSO.js';

/** 돌아온 결과(`/?sso=…`, 서버 auth/sso.ts)마다 보일 문장. 승인 대기는 잘못이 아니라 기다림이라 오류 모양으로 안 그린다 */
const SSO안내: Record<string, { 문장: string; 오류: boolean }> = {
  pending: { 문장: '가입 신청을 검토하고 있습니다. 관리자가 수락하면 로그인할 수 있습니다', 오류: false },
  username: { 문장: '이 플랫폼에서 쓸 수 없는 아이디입니다. 관리자가 확인해야 합니다', 오류: true },
  failed: { 문장: '로그인하지 못했습니다. 버튼을 다시 누르면 됩니다', 오류: true },
  // 서버가 아니라 화면이 단다 — 로그아웃 (main.tsx 나간다 · 브라우저의 로그아웃 표시)
  out: { 문장: '로그아웃했습니다', 오류: false },
};

/** 카드의 버튼이 고르는 갈래 — 서버가 허용 값만 Auth_platform 에 싣는다 (auth/sso.ts) */
function 시작주소(그래프: string | null, 갈래: { login_hint?: string; prompt?: 'login' } = {}): string {
  const 값 = new URLSearchParams();
  if (그래프 !== null) 값.set('next', 그래프);
  if (갈래.login_hint !== undefined) 값.set('login_hint', 갈래.login_hint);
  if (갈래.prompt !== undefined) 값.set('prompt', 갈래.prompt);
  const 글 = 값.toString();
  return 글 === '' ? '/api/auth/sso/start' : `/api/auth/sso/start?${글}`;
}

/**
 * maxihan 계정(SSO)이 켜진 설치의 로그인 화면 (SPEC §8.6). 알림 없이 오면 그리지 않고 바로 Auth_platform 으로 보낸다 —
 * 버튼 하나짜리 중간 화면이 있으면 로그인 화면을 두 번 거친다 (2026-10-27 사용자).
 * 알림이 있으면 카드를 그리고 보내지 않는다 — 실패해 돌아온 사람을 다시 보내면 Auth_platform 과 끝없이 오간다.
 * 브라우저에 로그아웃 표시가 있어도 카드다 — 로그아웃은 Auth_platform 세션을 남겨 보내면 곧장 다시 들어온다 (2026-10-29 사용자)
 */
function SSO로그인({ on언어, 떠난다 }: { on언어: (고른: 언어) => void; 떠난다: (주소: string) => void }) {
  const t = use말();
  const 언어 = use언어();
  const 주소칸 = window.location.search;
  const 결과 = new URLSearchParams(주소칸).get('sso');
  // 표에 없는 값(`toString` 같은 물려받은 이름 포함)은 알림이 없는 것과 같다
  const 알림 = 결과 !== null && Object.hasOwn(SSO안내, 결과) ? SSO안내[결과] : undefined;
  // 처음 그릴 때 한 번만 읽는다 — 버튼을 누르며 지운 뒤 다시 그려도 카드가 바뀌지 않게
  const [나갔음] = useState(로그아웃했나);
  const [계정] = useState(기억한계정을읽는다);
  const 안내 = 알림 ?? (나갔음 ? SSO안내.out : undefined);
  // Grafana 에서 왔으면 돌아올 자리를 실어 보낸다 — 서버가 같은 규칙으로 다시 거른다 (auth/sso.ts)
  const 그래프 = 그래프로돌아갈곳(주소칸);
  const 시작 = 시작주소(그래프);
  // 버튼을 누르면 로그아웃 표시를 지운다 — 들어온 뒤 새 탭에서도 카드가 남으면 안 된다
  const 간다 = (주소: string) => {
    로그아웃표시를뗀다();
    떠난다(주소);
  };
  // 한 번만 보낸다. StrictMode 가 효과를 두 번 돌리면 sso/start 가 두 번 불려 출입증의 왕복 값이 엇갈린다
  const 보냄 = useRef(false);
  useEffect(() => {
    if (안내 !== undefined || 보냄.current) return;
    보냄.current = true;
    떠난다(시작);
  }, [안내, 시작, 떠난다]);

  // 페이지가 옮겨 가는 동안 바탕만 둔다. 빈 흰 화면이 번쩍이지 않게
  if (안내 === undefined) return <div className="login" />;
  return (
    <div className="login">
      <div className="login-box login-sso">
        <div className="login-logo" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
            <path d="m21 2-9.6 9.6" />
            <circle cx="7.5" cy="15.5" r="5.5" />
          </svg>
        </div>
        <div className="login-head">
          <p className="login-app">Test Commander</p>
          <h1 className="login-greet">{t('로그인')}</h1>
          <p className="login-sub">{t('로그인하면 맡은 애플리케이션이 열립니다.')}</p>
        </div>
        <p className={안내.오류 ? 'err login-err' : 'login-info'}>
          {안내.오류 ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          ) : null}
          {t(안내.문장)}
        </p>
        {/* 서버가 Auth_platform 으로 보낸다. 링크가 아니라 주소 바꾸기라 뒤로 가기에 이 카드가 남지 않는다 */}
        {계정 === null ? (
          <button type="button" className="btn" onClick={() => 간다(시작)}>
            {t('QA Hub 통합계정으로 로그인')}
          </button>
        ) : (
          <>
            {/* Auth_platform 세션이 살아 있으면 비밀번호 없이 그 계정으로 들어온다. 끝났으면 아이디가 채워진 로그인 화면이다 */}
            <button type="button" className="btn login-account" onClick={() => 간다(시작주소(그래프, { login_hint: 계정.username }))}>
              <span className="login-avatar" aria-hidden="true">
                {Array.from(계정.name || 계정.username)[0]?.toUpperCase()}
              </span>
              <span className="login-account-text">
                <span>{t('이 계정으로 로그인')}</span>
                <span className="login-account-who">
                  {계정.name === '' || 계정.name === 계정.username ? 계정.username : `${계정.name} · ${계정.username}`}
                </span>
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            {/* Auth_platform 이 세션을 끊고 빈 아이디 · 비밀번호 화면을 보인다. 다른 사람이 들어올 수 있어 기억한 계정도 지운다 */}
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                기억한계정을지운다();
                간다(시작주소(그래프, { prompt: 'login' }));
              }}
            >
              {t('다른 계정으로 로그인')}
            </button>
          </>
        )}
        <div className="side-lang login-lang">
          <언어고르개 언어={언어} on언어={on언어} />
        </div>
      </div>
    </div>
  );
}

/**
 * Grafana 문이 로그인 화면으로 보낼 때 실어 준 돌아올 자리 (도메인/인증 §7 「Grafana 통로」).
 * `/grafana/` 로 시작할 때만 받는다 — 아무 주소나 받으면 이 로그인 화면이 남의 사이트로 보내는 발판이 된다
 */
function 그래프로돌아갈곳(search: string): string | null {
  const next = new URLSearchParams(search).get('next');
  return next?.startsWith('/grafana/') ? next : null;
}

// 렌더마다 새 함수가 되면 SSO로그인의 보내기가 다시 돈다.
// 지금 자리를 기록에서 바꿔 끼운다 — 뒤로 가기가 빈 로그인 화면 · Auth_platform 로그인 화면으로 가지 않게 (2026-10-29 사용자)
const 페이지를옮긴다 = (주소: string) => window.location.replace(주소);

export function Login({
  onLogin,
  on언어,
  // 검사가 진짜 페이지 이동 대신 끼운다. jsdom 의 location.replace 는 바꿔 끼울 수 없다
  떠난다 = 페이지를옮긴다,
}: {
  onLogin: (user: User) => void;
  /** 로그인 전에도 언어를 고른다. 들고 있는 것은 `main.tsx` 다 */
  on언어: (고른: 언어) => void;
  떠난다?: (주소: string) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState<string | null>(null);
  const [기다림, set기다림] = useState(false);
  const [busy, setBusy] = useState(false);
  // 묻는 동안은 아이디 · 비밀번호 칸을 그린다 — 대부분의 설치가 그 모양이고, 칸이 비어 보이는 것보다 낫다
  const sso = useSSO();

  if (sso === true) return <SSO로그인 on언어={on언어} 떠난다={떠난다} />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailed(null);
    set기다림(false);
    try {
      const { user } = await api.login(username, password);
      // Grafana 는 이 화면(해시 라우터) 밖이라 해시가 아니라 페이지를 옮긴다.
      // 문이 막을 사람(변경 강제 · 대시보드 none)을 보내면 403 JSON 만 보고 변경 화면에 못 닿는다
      const 그래프 = 그래프로돌아갈곳(window.location.search);
      if (그래프 === null || user.mustChangePassword || user.dashboard !== 'read') onLogin(user);
      else 떠난다(그래프);
    } catch (err) {
      // 비밀번호가 맞은 사람에게만 오는 답이다. 잘못한 것이 아니라 기다리는 중이라 오류 모양으로 안 그린다
      if (err instanceof ApiError && err.code === 'PENDING_APPROVAL') {
        set기다림(true);
        return;
      }
      // 어느 쪽이 틀렸는지 알려주면 밖에서 아이디가 있는지 하나씩 확인할 수 있다 (SPEC §8.6).
      // 서버도 같은 이유로 401 하나만 준다 — 화면이 그 문장을 지어낸다
      setFailed(
        err instanceof ApiError && err.status === 401
          ? t('아이디 또는 비밀번호가 맞지 않습니다')
          : message(err, 언어),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login-box" onSubmit={(e) => void submit(e)}>
        <div className="login-title">Test Commander</div>
        <h1 className="login-greet">{t('로그인')}</h1>
        {/* 빈 상자 하나만 두면 무엇을 하는 화면인지 안 읽힌다. 짙은 바탕 위 밝은 상자로
            들어가는 자리임을 분명히 한다 (docs/design-mockup.html) */}
        <p className="login-sub">{t('아이디와 비밀번호를 넣으면 맡은 애플리케이션이 열립니다.')}</p>

        <div className="field">
          <label htmlFor="login-id">{t('아이디')}</label>
          <div>
            <input
              type="text"
              id="login-id"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="login-pw">{t('비밀번호')}</label>
          <div>
            {/* 가려서 입력받는다. §8.2 의 비밀값 칸과 같은 모양이다 */}
            <input
              type="password"
              id="login-pw"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {failed === null ? null : <div className="err login-err">{failed}</div>}
        {기다림 ? (
          <p className="login-info">{t('가입 신청을 검토하고 있습니다. 관리자가 수락하면 로그인할 수 있습니다')}</p>
        ) : null}

        {/* 누르는 동안 잠근다. 두 번 누르면 두 번 간다 */}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? t('확인하는 중') : t('로그인')}
        </button>
        <a href="#/signup">{t('회원가입')}</a>
        <div className="side-lang login-lang">
          <언어고르개 언어={언어} on언어={on언어} />
        </div>
      </form>
    </div>
  );
}
