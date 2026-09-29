// 회원가입 화면 (SPEC 도메인/인증 §8.6 「회원가입 화면」). 승인 대기 계정만 만든다 — 권한 칸은 없다

import { useState } from 'react';

import { 비밀번호최대, 비밀번호최소, 아이디모양, 이름최대 } from '../auth/rules.js';

import { api, ApiError } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

type 칸 = 'username' | 'displayName' | 'password' | 'confirm';

export function Signup() {
  const t = use말();
  const 언어 = use언어();
  const [값, set값] = useState<Record<칸, string>>({ username: '', displayName: '', password: '', confirm: '' });
  const [사유, set사유] = useState<Partial<Record<칸, string>>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [보냄, set보냄] = useState(false);

  // 서버도 같은 규칙으로 다시 막는다. 화면이 먼저 보는 것은 칸 아래에 바로 알려 주려는 것이다
  function 살핀다(): Partial<Record<칸, string>> {
    const 결과: Partial<Record<칸, string>> = {};
    if (값.username.trim() === '') 결과.username = t('아이디를 채웁니다');
    else if (!아이디모양.test(값.username)) {
      결과.username = t('영문 소문자·숫자·. _ - 로 2~32자, 첫 글자는 소문자나 숫자입니다');
    }
    if (값.displayName.trim() === '') 결과.displayName = t('이름을 채웁니다');
    if (값.password === '') 결과.password = t('비밀번호를 채웁니다');
    else if (값.password.length < 비밀번호최소) 결과.password = t('비밀번호는 8자 이상이어야 합니다');
    else if (값.password !== 값.confirm) 결과.confirm = t('두 비밀번호가 다릅니다');
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
      await api.signup({ username: 값.username, displayName: 값.displayName.trim(), password: 값.password });
      set보냄(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'USERNAME_TAKEN') set사유({ username: t('이미 쓰는 아이디입니다') });
      else setFailed(message(err, 언어));
    } finally {
      setBusy(false);
    }
  }

  const 로그인으로 = <a href="#/login">{t('로그인 화면으로')}</a>;

  if (보냄) {
    return (
      <div className="login">
        <div className="login-box">
          <div className="login-title">{t('테스트 플랫폼')}</div>
          <p className="login-info">{t('가입 신청을 보냈습니다. 운영자가 수락하면 로그인할 수 있습니다')}</p>
          {로그인으로}
        </div>
      </div>
    );
  }

  function 칸하나(이름: 칸, 라벨: string, 종류: 'text' | 'password', 자동: string, 최대: number) {
    const id = `signup-${이름}`;
    return (
      <div className="field">
        <label htmlFor={id}>{라벨}</label>
        <div>
          <input
            type={종류}
            id={id}
            autoComplete={자동}
            maxLength={최대}
            value={값[이름]}
            onChange={(e) => set값({ ...값, [이름]: e.target.value })}
            // 화면 낭독기는 빨간 글자를 못 본다. 칸에 들어설 때 틀렸다는 것과 사유를 같이 읽게 한다
            aria-invalid={사유[이름] === undefined ? undefined : true}
            aria-describedby={사유[이름] === undefined ? undefined : `${id}-err`}
          />
          {사유[이름] === undefined ? null : (
            <div className="err login-err" id={`${id}-err`}>
              {사유[이름]}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <form className="login-box" onSubmit={(e) => void submit(e)} noValidate>
        <div className="login-title">{t('테스트 플랫폼')}</div>
        <h1 className="login-greet">{t('계정을 신청합니다')}</h1>
        <p className="login-sub">{t('운영자가 수락하면 로그인할 수 있습니다.')}</p>

        {칸하나('username', t('아이디'), 'text', 'username', 32)}
        {칸하나('displayName', t('이름'), 'text', 'name', 이름최대)}
        {칸하나('password', t('비밀번호'), 'password', 'new-password', 비밀번호최대)}
        {칸하나('confirm', t('비밀번호 확인'), 'password', 'new-password', 비밀번호최대)}

        {failed === null ? null : <div className="err login-err">{failed}</div>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? t('보내는 중') : t('가입 신청')}
        </button>
        {로그인으로}
      </form>
    </div>
  );
}
