// 로그인 화면 (SPEC §8.6). 아이디 칸, 비밀번호 칸, 로그인 버튼, 그 아래 회원가입 링크. 그 밖에 아무것도 없다
// 가입은 승인 대기 계정만 만든다 — 문을 여는 판단은 여전히 운영자가 설정 화면에서 한다 (§8.8)

import { useState } from 'react';

import { api, ApiError, type User } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

/**
 * Grafana 문이 로그인 화면으로 보낼 때 실어 준 돌아올 자리 (도메인/인증 §7 「Grafana 통로」).
 * `/grafana/` 로 시작할 때만 받는다 — 아무 주소나 받으면 이 로그인 화면이 남의 사이트로 보내는 발판이 된다
 */
function 그래프로돌아갈곳(search: string): string | null {
  const next = new URLSearchParams(search).get('next');
  return next?.startsWith('/grafana/') ? next : null;
}

export function Login({
  onLogin,
  // 검사가 진짜 페이지 이동 대신 끼운다. jsdom 의 location.assign 은 바꿔 끼울 수 없다
  떠난다 = (주소: string) => window.location.assign(주소),
}: {
  onLogin: (user: User) => void;
  떠난다?: (주소: string) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState<string | null>(null);
  const [기다림, set기다림] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailed(null);
    set기다림(false);
    try {
      const { user } = await api.login(username, password);
      // Grafana 는 이 화면(해시 라우터) 밖이라 해시가 아니라 페이지를 옮긴다
      const 그래프 = 그래프로돌아갈곳(window.location.search);
      if (그래프 === null) onLogin(user);
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
        <div className="login-title">{t('테스트 플랫폼')}</div>
        <h1 className="login-greet">{t('다시 오셨군요')}</h1>
        {/* 빈 상자 하나만 두면 무엇을 하는 화면인지 안 읽힌다. 짙은 바탕 위 밝은 상자로
            들어가는 자리임을 분명히 한다 (docs/design-mockup.html) */}
        <p className="login-sub">{t('아이디와 비밀번호를 넣으면 맡은 서비스가 열립니다.')}</p>

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
          <p className="login-info">{t('가입 신청을 검토하고 있습니다. 운영자가 수락하면 로그인할 수 있습니다')}</p>
        ) : null}

        {/* 누르는 동안 잠근다. 두 번 누르면 두 번 간다 */}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? t('확인하는 중') : t('로그인')}
        </button>
        <a href="#/signup">{t('회원가입')}</a>
      </form>
    </div>
  );
}
