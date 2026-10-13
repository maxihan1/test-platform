// 대상 서버 한 줄의 역할 계정 칸과 비밀번호 칸 — 일반 회원 밖의 「관리자」 · 「판매자」 같은 계정 (도메인/인증 §8.8 · 작성 §3.6 「★ 역할별 계정」)
// SettingsEnvs.tsx 가 300줄에 닿지 않게 뗐다. 비밀번호 칸은 일반 회원과 역할 계정이 같이 쓴다

import type { EnvInput, EnvRow } from './api.js';
import { use말 } from './i18n.js';

/** 편집 중인 역할 계정 한 줄. `key` 는 화면에만 있다 — 서버로 보낼 때 뺀다(SettingsEnvs 의 줄과 같은 까닭) */
export interface 역할줄 {
  key: string;
  role: string;
  loginId: string | null;
  hasLoginPassword: boolean;
  /** 불러올 때의 역할 이름. 새로 더한 줄은 null — 서버는 이름이 같은 역할의 옛 값을 이어받는다 */
  원래역할: string | null;
  /** null 이면 안 보낸다 — 서버가 지금 비밀번호를 유지한다 */
  새비밀번호: string | null;
  비밀번호지움?: boolean;
}

let 역할번호 = 0;
function 새역할키(): string {
  역할번호 += 1;
  return `role-${String(역할번호)}`;
}

export const 역할줄로 = (accounts: NonNullable<EnvRow['accounts']>): 역할줄[] =>
  accounts.map((a) => ({ ...a, key: 새역할키(), 원래역할: a.role, 새비밀번호: null }));

/** 이름을 바꾼 역할은 새 역할이다 — 서버가 이름으로 이어받아서 옛 비밀번호가 따라오지 않는다 */
const 새역할인가 = (r: 역할줄): boolean => r.원래역할 === null || r.role.trim() !== r.원래역할;

/**
 * 서버로 보낼 역할 한 줄. 일반 회원과 같은 규칙이다 — 아이디는 받은 대로 되돌려 보내고 비밀번호는 새로 넣었을 때만 싣는다.
 * **새 역할(이름을 바꾼 것 포함)은 빈 비밀번호를 null 로 명시한다** — 같은 이름의 역할을 빼고 다시 더해 한 번에 저장하면
 * 키가 없는 칸을 서버가 옛 값으로 되살린다
 */
export const 역할보낼모양 = (r: 역할줄): NonNullable<EnvInput['accounts']>[number] => {
  const 새값 = r.새비밀번호 !== null && r.새비밀번호 !== '' ? r.새비밀번호 : null;
  return {
    role: r.role,
    loginId: r.loginId,
    ...(새값 !== null ? { loginPassword: 새값 } : r.비밀번호지움 === true || 새역할인가(r) ? { loginPassword: null } : {}),
  };
};

/** 비밀번호가 있던 역할의 이름을 바꿨나. 새 비밀번호를 안 넣었으면 저장 때 비워진다고 미리 알린다 */
export const 역할이름바꿈 = (r: 역할줄): boolean =>
  r.원래역할 !== null && 새역할인가(r) && r.hasLoginPassword && r.비밀번호지움 !== true && (r.새비밀번호 === null || r.새비밀번호 === '');

interface 비밀번호상태 {
  hasLoginPassword?: boolean;
  새비밀번호: string | null;
  비밀번호지움?: boolean;
}

/**
 * 비밀번호는 되돌려 보여주지 않아 고치는 길이 「변경」이다 (도메인/인증 §8.8).
 * **자동완성을 끈다** — 브라우저가 이 관리 화면의 로그인 비밀번호를 채워 넣으면 플랫폼 계정이 테스트 계정으로 저장된다
 */
export function 비밀번호칸<T extends 비밀번호상태>({
  값,
  고친다,
  라벨,
}: {
  값: T;
  고친다: (next: T) => void;
  라벨: { 칸: string; 추가: string; 변경: string; 삭제: string; 취소: string };
}) {
  const t = use말();
  const 있다 = 값.hasLoginPassword === true && 값.비밀번호지움 !== true;
  if (값.새비밀번호 === null) {
    return (
      <span className="set-hook">
        <span>{있다 ? t('비밀번호 설정됨') : t('비밀번호 없음')}</span>
        {/* 없을 때는 `+` 기호 하나, 있을 때는 글자 「변경」과 `−` — 있는데 `+` 를 또 보이면 헷갈린다. 기호만 보이는 버튼의 이름은 aria-label 이 맡는다 */}
        <button
          className={있다 ? 'btn ghost' : 'btn ghost icon'}
          aria-label={있다 ? 라벨.변경 : 라벨.추가}
          title={있다 ? undefined : 라벨.추가}
          onClick={() => 고친다({ ...값, 새비밀번호: '', 비밀번호지움: false })}
        >
          {있다 ? t('변경') : '+'}
        </button>
        {있다 ? (
          <button className="btn ghost icon" aria-label={라벨.삭제} title={라벨.삭제} onClick={() => 고친다({ ...값, 비밀번호지움: true })}>
            −
          </button>
        ) : null}
      </span>
    );
  }
  return (
    <span className="set-hook">
      <input
        type="password"
        autoComplete="new-password"
        value={값.새비밀번호}
        placeholder={t('테스트 비밀번호')}
        aria-label={라벨.칸}
        onChange={(e) => 고친다({ ...값, 새비밀번호: e.target.value })}
      />
      {값.hasLoginPassword === true ? (
        <button className="btn ghost" aria-label={라벨.취소} onClick={() => 고친다({ ...값, 새비밀번호: null })}>
          {t('변경 취소')}
        </button>
      ) : null}
    </span>
  );
}

/** 한 대상 서버 줄의 역할 계정들과 「역할 추가」. 역할 이름은 케이스의 `account` 꼬리표와 글자로 잇는다 (작성 §3.6) */
export function 역할계정칸들({ 역할들, 번호, 고친다 }: { 역할들: 역할줄[]; 번호: number; 고친다: (next: 역할줄[]) => void }) {
  const t = use말();
  const 바꾼다 = (k: number, next: 역할줄) => 고친다(역할들.map((r, i) => (i === k ? next : r)));
  return (
    <>
      {역할들.map((r, k) => {
        const 자리 = { 번호, 순번: k + 1 };
        return (
          <div className="set-env-login" key={r.key}>
            <input
              type="text"
              autoComplete="off"
              value={r.role}
              placeholder={t('역할 이름')}
              aria-label={t('대상 서버 {번호} 역할 {순번} 이름', 자리)}
              onChange={(e) => 바꾼다(k, { ...r, role: e.target.value })}
            />
            <input
              type="text"
              autoComplete="off"
              value={r.loginId ?? ''}
              placeholder={t('테스트 아이디')}
              aria-label={t('대상 서버 {번호} 역할 {순번} 아이디', 자리)}
              onChange={(e) => 바꾼다(k, { ...r, loginId: e.target.value })}
            />
            <비밀번호칸
              값={r}
              고친다={(next) => 바꾼다(k, next)}
              라벨={{
                칸: t('대상 서버 {번호} 역할 {순번} 비밀번호', 자리),
                추가: t('대상 서버 {번호} 역할 {순번} 비밀번호 추가', 자리),
                변경: t('대상 서버 {번호} 역할 {순번} 비밀번호 변경', 자리),
                삭제: t('대상 서버 {번호} 역할 {순번} 비밀번호 삭제', 자리),
                취소: t('대상 서버 {번호} 역할 {순번} 비밀번호 변경 취소', 자리),
              }}
            />
            <button
              className="btn ghost icon"
              aria-label={t('대상 서버 {번호} 역할 {순번} 삭제', 자리)}
              title={t('대상 서버 {번호} 역할 {순번} 삭제', 자리)}
              onClick={() => 고친다(역할들.filter((_, i) => i !== k))}
            >
              −
            </button>
            {역할이름바꿈(r) ? <div className="hint">{t('역할 이름을 바꾸면 이 역할의 비밀번호가 초기화됩니다. 저장한 뒤 다시 입력해 주세요')}</div> : null}
          </div>
        );
      })}
      <div className="set-env-login">
        <button
          className="btn ghost"
          aria-label={t('대상 서버 {번호} 역할 추가', { 번호 })}
          onClick={() =>
            고친다([...역할들, { key: 새역할키(), role: '', loginId: null, hasLoginPassword: false, 원래역할: null, 새비밀번호: '' }])
          }
        >
          {t('+ 역할 추가')}
        </button>
      </div>
    </>
  );
}
