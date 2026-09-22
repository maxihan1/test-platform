// 로그인 화면 (SPEC §8.6). 아이디 칸, 비밀번호 칸, 로그인 버튼. 그 밖에 아무것도 없다
// 회원가입 화면은 없다 — 계정은 운영자가 설정 화면에서 만든다 (§8.8)

import { useState } from 'react';

import { api, ApiError, type User } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const t = use말();
  const 언어 = use언어();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailed(null);
    try {
      const { user } = await api.login(username, password);
      onLogin(user);
    } catch (err) {
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

        {/* 누르는 동안 잠근다. 두 번 누르면 두 번 간다 */}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? t('확인하는 중') : t('로그인')}
        </button>
      </form>
    </div>
  );
}
