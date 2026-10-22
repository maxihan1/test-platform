// 대상 서버 한 줄의 「어드민 키」 칸 — 게임 서버 어드민 API 머리 이름과 값 (도메인/게임 §3.10 「케이스 꼴」 · 도메인/인증 §7 adminKey)
// SettingsEnvs.tsx 가 300줄에 닿지 않게 뗐다. API 인증 칸(SettingsApiAuths.tsx)과 같은 규칙이고 줄마다 하나라 「추가」가 없다 (2026-10-23 시안 A)

import type { EnvInput, EnvRow } from './api.js';
import { t as 말, use말, type 언어 } from './i18n.js';

/** 편집 중인 어드민 키. 새값이 빈 글자면 안 보낸다 — 서버가 같은 대상 서버 · 같은 머리의 옛 값을 이어받는다 */
export interface 어드민키편집 {
  header: string;
  새값: string;
}

interface 어드민키줄 {
  env: string;
  원래키: string | null;
  adminKey?: EnvRow['adminKey'];
  어드민?: 어드민키편집;
}

export const 어드민키편집으로 = (k: EnvRow['adminKey']): 어드민키편집 => ({ header: k?.header ?? '', 새값: '' });

// 편집한 적 없는 줄은 받은 머리 그대로다 — 빈 칸으로 읽으면 저장 때 키가 지워진다
const 지금칸 = (r: 어드민키줄) => {
  const 편집 = r.어드민 ?? 어드민키편집으로(r.adminKey);
  return { header: 편집.header.trim(), 새값: 편집.새값 };
};

/** 옛 값을 이어받을 수 없는데 값이 비었나 — 새 머리 · 바꾼 머리 · 이름을 바꾼 대상 서버다. 그대로 보내면 400 ADMIN_KEY_VALUE_REQUIRED */
const 값필요 = (r: 어드민키줄): boolean => {
  const { header, 새값 } = 지금칸(r);
  if (header === '' || 새값 !== '') return false;
  return r.adminKey == null || r.adminKey.header !== header || (r.원래키 !== null && r.env !== r.원래키);
};

/** 두 칸이 다 비면 지운다(null). 값은 새로 넣었을 때만 싣는다 — 화면은 원문을 받은 적이 없다 */
export function 어드민키보낼모양(r: 어드민키줄): EnvInput['adminKey'] {
  const { header, 새값 } = 지금칸(r);
  if (header === '' && 새값 === '') return null;
  return { header, ...(새값 === '' ? {} : { value: 새값 }) };
}

/** 저장을 막을 까닭. 서버 settings/apiService.ts `API칸오류` 와 같은 규칙이다 — 서버는 BAD_ADMIN_KEY 하나로만 답해 어느 칸인지 모른다 */
export function 어드민키못보내는이유(envs: readonly 어드민키줄[], 언어: 언어): string | null {
  const 칸들 = envs.map(지금칸);
  if (칸들.some((it) => it.header === '' && it.새값 !== '')) return 말('어드민 키 머리 이름을 입력해 주세요', 언어);
  if (칸들.some((it) => it.header !== '' && !/^[A-Za-z0-9-]{1,100}$/.test(it.header))) {
    return 말('어드민 키 머리 이름은 영문 · 숫자 · - 로 100자까지입니다', 언어);
  }
  if (칸들.some((it) => it.새값 !== '' && !/^[\x21-\x7e]{12,500}$/.test(it.새값))) {
    return 말('어드민 키 값은 공백 없이 12자 이상 500자 이하로 입력해 주세요', 언어);
  }
  if (envs.some(값필요)) return 말('새 어드민 키는 값을 입력해 주세요. 머리 이름이나 대상 서버 이름을 바꾸면 다시 넣어야 합니다', 언어);
  return null;
}

/** 한 대상 서버 줄의 어드민 키 두 칸. 케이스는 키를 글자로 쓰지 않고 kit 이 이 칸을 머리로 넣는다 (도메인/게임 §3.10) */
export function 어드민키칸({ 줄: r, 번호, 고친다 }: { 줄: 어드민키줄; 번호: number; 고친다: (next: 어드민키편집) => void }) {
  const t = use말();
  const 지금 = r.어드민 ?? 어드민키편집으로(r.adminKey);
  const 끝넷 = r.adminKey?.valueLast4 ?? null;
  return (
    <div className="set-env-login">
      <span className="field-label">{t('어드민 키')}</span>
      <input
        type="text"
        autoComplete="off"
        value={지금.header}
        placeholder="X-Admin-Key"
        aria-label={t('대상 서버 {번호} 어드민 키 머리 이름', { 번호 })}
        onChange={(e) => 고친다({ ...지금, header: e.target.value })}
      />
      {/* 비워 두면 저장한 값을 그대로 쓴다. 이어받지 못하는 줄에 끝 4자리를 보이면 남는 값으로 읽혀서 뺀다.
          자동완성을 끈다 — 브라우저가 이 관리 화면의 로그인 비밀번호를 채워 넣으면 그것이 키로 저장된다 */}
      <input
        type="password"
        autoComplete="new-password"
        value={지금.새값}
        placeholder={끝넷 === null || 값필요({ ...r, 어드민: 지금 }) ? t('키 값') : `•••• ${끝넷}`}
        aria-label={t('대상 서버 {번호} 어드민 키 값', { 번호 })}
        onChange={(e) => 고친다({ ...지금, 새값: e.target.value })}
      />
    </div>
  );
}
