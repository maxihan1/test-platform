// 대상 서버 한 줄의 「API 인증」 칸 — 이름 · 토큰 주소 · 클라이언트 ID · 비밀값 (도메인/API §3.8 · 도메인/인증 §7 apiAuths)
// SettingsEnvs.tsx 가 300줄에 닿지 않게 뗐다. 역할 계정(SettingsEnvAccounts.tsx)과 같은 꼴이다

import type { EnvInput, EnvRow } from './api.js';
import { t as 말, use말, type 언어 } from './i18n.js';

/** 편집 중인 API 인증 한 줄. `key` 는 화면에만 있다 — 서버로 보낼 때 뺀다(SettingsEnvs 의 줄과 같은 까닭) */
export interface API인증줄 {
  key: string;
  name: string;
  tokenUrl: string;
  clientId: string;
  /** 저장된 비밀값의 끝 4자리. 새로 더한 줄은 null */
  clientSecretLast4: string | null;
  /** 불러올 때의 이름 · 토큰 주소. 서버는 같은 대상 서버 · 이름 · 토큰 주소일 때만 옛 비밀값을 이어받는다 */
  원래이름: string | null;
  원래주소: string | null;
  /** 빈 글자면 안 보낸다 — 서버가 옛 비밀값을 이어받는다 */
  새비밀값: string;
}

let 인증번호 = 0;
function 새인증키(): string {
  인증번호 += 1;
  return `auth-${String(인증번호)}`;
}

export const API인증줄로 = (auths: NonNullable<EnvRow['apiAuths']>): API인증줄[] =>
  auths.map((a) => ({ ...a, key: 새인증키(), 원래이름: a.name, 원래주소: a.tokenUrl, 새비밀값: '' }));

/** 불러온 뒤 대상 서버 주소를 바꿨나. / 로 시작하는 토큰 주소와 케이스의 admin 요청이 그 주소로 가서 옛 비밀값을 못 이어받는다 */
export const 서버주소바뀜 = (e: { baseUrl: string; 원래서버주소?: string }): boolean => e.원래서버주소 !== undefined && e.baseUrl !== e.원래서버주소;

/**
 * 이어받을 옛 비밀값이 없는데 비밀값 칸이 비었나 — 새로 더했거나 이름 · 토큰 주소 · 대상 서버 이름을 바꾼 인증, 주소를 바꾼 줄의 / 토큰 주소다.
 * 그대로 보내면 서버가 400 API_AUTH_SECRET_REQUIRED 를 낸다(토큰 주소를 바꾸면 끝 4자리만 본 사람이 원문을 다른 곳으로 못 보내게 다시 받는다)
 */
export const 비밀값필요 = (r: API인증줄, 서버이름바뀜: boolean, 주소바뀜: boolean): boolean =>
  r.새비밀값 === '' &&
  (서버이름바뀜 || r.원래이름 === null || r.name.trim() !== r.원래이름 || r.tokenUrl !== r.원래주소 || (주소바뀜 && r.tokenUrl.startsWith('/')));

/** 서버로 보낼 한 줄. 비밀값은 새로 넣었을 때만 싣는다 — 화면은 원문을 받은 적이 없다 */
export const API인증보낼모양 = (r: API인증줄): NonNullable<EnvInput['apiAuths']>[number] => ({
  name: r.name,
  tokenUrl: r.tokenUrl,
  clientId: r.clientId,
  ...(r.새비밀값 === '' ? {} : { clientSecret: r.새비밀값 }),
});

/** 저장을 막을 까닭. 서버가 400 으로 막을 것을 사람 말로 먼저 짚는다 — 어느 칸인지 응답에 안 담겨 온다 */
export function API인증못보내는이유(
  envs: readonly { env: string; 원래키: string | null; baseUrl: string; 원래서버주소?: string; API인증들: API인증줄[] }[],
  언어: 언어,
): string | null {
  const 줄들 = envs.flatMap((e) => e.API인증들.map((r) => ({ r, 바뀜: e.원래키 !== null && e.env !== e.원래키, 주소: 서버주소바뀜(e) })));
  if (줄들.some(({ r }) => r.name.trim() === '' || r.tokenUrl === '' || r.clientId === '')) {
    return 말('API 인증에 비어 있는 칸이 있습니다. 입력하거나 그 인증을 삭제해 주세요', 언어);
  }
  if (줄들.some(({ r, 바뀜, 주소 }) => 비밀값필요(r, 바뀜, 주소))) return 말('API 인증 비밀값을 입력해 주세요', 언어);
  // 아래는 서버 settings/apiService.ts `API인증틀림` 과 같은 규칙이다 — 서버는 BAD_API_AUTH 하나로만 답해 어느 칸인지 모른다
  const 이름틀림 = envs.some((e) => {
    const 이름들 = e.API인증들.map((r) => r.name.trim());
    return 이름들.length > 10 || new Set(이름들).size !== 이름들.length || 이름들.some((이름) => 이름.length > 20);
  });
  if (이름틀림) return 말('API 인증 이름은 20자까지이고 한 대상 서버 안에서 겹치지 않아야 합니다 (서버마다 10개까지)', 언어);
  if (줄들.some(({ r }) => !((r.tokenUrl.startsWith('/') && !r.tokenUrl.startsWith('//')) || /^https?:\/\/\S+$/.test(r.tokenUrl)))) {
    return 말('토큰 주소는 / 나 http(s):// 로 시작해야 합니다', 언어);
  }
  if (줄들.some(({ r }) => r.새비밀값 !== '' && (r.새비밀값.length < 12 || r.새비밀값.length > 500))) {
    return 말('비밀값은 12자 이상 500자 이하로 입력해 주세요', 언어);
  }
  return null;
}

/** 한 대상 서버 줄의 API 인증들과 「+ API 인증 추가」. 케이스는 이름으로만 부른다 — 같은 이름을 서버마다 넣어 두면 케이스가 서버를 몰라도 된다 (도메인/API §3.8) */
export function API인증칸들({
  인증들,
  번호,
  서버이름바뀜,
  주소바뀜,
  고친다,
}: {
  인증들: API인증줄[];
  번호: number;
  서버이름바뀜: boolean;
  주소바뀜: boolean;
  고친다: (next: API인증줄[]) => void;
}) {
  const t = use말();
  const 바꾼다 = (k: number, next: API인증줄) => 고친다(인증들.map((r, i) => (i === k ? next : r)));
  return (
    <>
      <div className="set-env-login">
        <span className="field-label">{t('API 인증')}</span>
      </div>
      {인증들.map((r, k) => {
        const 자리 = { 번호, 순번: k + 1 };
        const 다시넣기 = 비밀값필요(r, 서버이름바뀜, 주소바뀜);
        return (
          <div className="set-env-login" key={r.key}>
            <input
              type="text"
              autoComplete="off"
              value={r.name}
              placeholder={t('이름')}
              aria-label={t('대상 서버 {번호} API 인증 {순번} 이름', 자리)}
              onChange={(e) => 바꾼다(k, { ...r, name: e.target.value })}
            />
            <input
              type="text"
              autoComplete="off"
              value={r.tokenUrl}
              placeholder={t('토큰 주소')}
              aria-label={t('대상 서버 {번호} API 인증 {순번} 토큰 주소', 자리)}
              onChange={(e) => 바꾼다(k, { ...r, tokenUrl: e.target.value })}
            />
            <input
              type="text"
              autoComplete="off"
              value={r.clientId}
              placeholder={t('클라이언트 ID')}
              aria-label={t('대상 서버 {번호} API 인증 {순번} 클라이언트 ID', 자리)}
              onChange={(e) => 바꾼다(k, { ...r, clientId: e.target.value })}
            />
            {/* 비워 두면 저장한 값을 그대로 쓴다. 이어받지 못하는 줄에 끝 4자리를 보이면 남는 줄로 읽혀서 뺀다.
                자동완성을 끈다 — 브라우저가 이 관리 화면의 로그인 비밀번호를 채워 넣으면 그것이 비밀값으로 저장된다 */}
            <input
              type="password"
              autoComplete="new-password"
              value={r.새비밀값}
              placeholder={r.clientSecretLast4 === null || 다시넣기 ? t('비밀값') : `•••• ${r.clientSecretLast4}`}
              aria-label={t('대상 서버 {번호} API 인증 {순번} 비밀값', 자리)}
              onChange={(e) => 바꾼다(k, { ...r, 새비밀값: e.target.value })}
            />
            <button
              className="btn ghost small"
              aria-label={t('대상 서버 {번호} API 인증 {순번} 삭제', 자리)}
              onClick={() => 고친다(인증들.filter((_, i) => i !== k))}
            >
              {t('삭제')}
            </button>
            {/* 막 더한 빈 줄에는 띄우지 않는다 — 아직 적지 않은 것이지 틀린 것이 아니다 */}
            {다시넣기 && r.name.trim() !== '' ? (
              <div className="err">{t('비밀값을 입력해 주세요. 새 인증이거나 이름 · 토큰 주소 · 서버 주소를 바꾸면 다시 넣어야 합니다')}</div>
            ) : null}
          </div>
        );
      })}
      <div className="set-env-login">
        <button
          className="btn ghost"
          aria-label={t('대상 서버 {번호} API 인증 추가', { 번호 })}
          onClick={() =>
            고친다([...인증들, { key: 새인증키(), name: '', tokenUrl: '', clientId: '', clientSecretLast4: null, 원래이름: null, 원래주소: null, 새비밀값: '' }])
          }
        >
          {t('+ API 인증 추가')}
        </button>
        <div className="hint">{t('저장한 값은 보안상 다시 표시하지 않습니다 · 비밀값은 끝 4자리만 보입니다')}</div>
      </div>
    </>
  );
}
