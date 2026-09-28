// 비밀번호 변경 화면 (SPEC 도메인/인증 §8.6 「비밀번호 변경 화면」). 변경 강제와 스스로 바꾸기가 같은 상자를 쓴다

import { useState } from 'react';

import { 비밀번호최대, 비밀번호최소 } from '../auth/rules.js';

import { api, ApiError, type User } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

type 칸 = 'current' | 'next' | 'confirm';

interface Props {
  강제: boolean;
  /** 바꾼 뒤 다시 읽은 나. 변경 강제가 풀렸는지는 서버 답으로만 안다 */
  onDone: (user: User) => void;
  /** 변경 강제일 때만 쓴다 — 스스로 바꿀 때는 사이드바에 로그아웃이 있다 */
  onLogout?: () => void;
}

// 서버가 400 으로 거절한 까닭을 어느 칸 아래에 붙일지
const 서버사유: Record<string, [칸, string]> = {
  INVALID_CREDENTIALS: ['current', '현재 비밀번호가 맞지 않습니다'],
  PASSWORD_SAME: ['next', '지금 비밀번호와 다른 값을 넣습니다'],
  PASSWORD_SHORT: ['next', '비밀번호는 8자 이상입니다'],
};

export function PasswordChange({ 강제, onDone, onLogout }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [값, set값] = useState<Record<칸, string>>({ current: '', next: '', confirm: '' });
  const [사유, set사유] = useState<Partial<Record<칸, string>>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 서버도 같은 규칙으로 다시 막는다. 화면이 먼저 보는 것은 칸 아래에 바로 알려 주려는 것이다
  function 살핀다(): Partial<Record<칸, string>> {
    const 결과: Partial<Record<칸, string>> = {};
    if (값.current === '') 결과.current = t('현재 비밀번호를 채웁니다');
    if (값.next.length < 비밀번호최소) 결과.next = t('비밀번호는 8자 이상입니다');
    else if (값.next !== 값.confirm) 결과.confirm = t('두 비밀번호가 다릅니다');
    return 결과;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const 찾은것 = 살핀다();
    set사유(찾은것);
    setFailed(null);
    if (Object.keys(찾은것).length > 0) return;
    setBusy(true);
    try {
      await api.changePassword({ currentPassword: 값.current, newPassword: 값.next });
      const { user } = await api.me();
      onDone(user);
    } catch (err) {
      const 어디 = err instanceof ApiError ? 서버사유[err.code] : undefined;
      if (어디 === undefined) setFailed(message(err, 언어));
      else set사유({ [어디[0]]: t(어디[1]) });
    } finally {
      setBusy(false);
    }
  }

  function 칸하나(이름: 칸, 라벨: string, 자동: string) {
    const id = `pw-${이름}`;
    return (
      <div className="field">
        <label htmlFor={id}>{라벨}</label>
        <div>
          <input
            type="password"
            id={id}
            autoComplete={자동}
            maxLength={비밀번호최대}
            value={값[이름]}
            onChange={(e) => set값({ ...값, [이름]: e.target.value })}
          />
          {사유[이름] === undefined ? null : <div className="err login-err">{사유[이름]}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <form className="login-box" onSubmit={(e) => void submit(e)} noValidate>
        <div className="login-title">{t('테스트 플랫폼')}</div>
        <h1 className="login-greet">{t('비밀번호 변경')}</h1>
        {강제 ? <p className="login-sub">{t('처음 받은 비밀번호를 바꿔야 계속할 수 있습니다')}</p> : null}

        {칸하나('current', t('현재 비밀번호'), 'current-password')}
        {칸하나('next', t('새 비밀번호'), 'new-password')}
        {칸하나('confirm', t('새 비밀번호 확인'), 'new-password')}

        {failed === null ? null : <div className="err login-err">{failed}</div>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? t('바꾸는 중') : t('비밀번호 바꾸기')}
        </button>
        {/* 변경 강제 중에는 다른 화면이 없다. 빠져나갈 길은 로그아웃 하나다 (§8.6) */}
        {강제 ? (
          <button className="btn ghost" type="button" onClick={onLogout}>
            {t('로그아웃')}
          </button>
        ) : null}
      </form>
    </div>
  );
}
