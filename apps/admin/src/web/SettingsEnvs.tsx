// 설정 화면의 대상 서버 편집기 (SPEC §8.8 · §6 service_env)
// 여러 줄이다 — 환경변수 한 줄로는 서비스가 셋만 되어도 안 들어간다

import { 운영이름인가 } from '../settings/roles.js';

import type { EnvInput, EnvRow } from './api.js';
import { use말 } from './i18n.js';
import { 비밀번호칸, 역할계정칸들, 역할보낼모양, 역할줄로, type 역할줄 } from './SettingsEnvAccounts.js';

/**
 * 편집 중인 대상 서버 한 줄.
 *
 * `key` 는 **화면에만 있는 값**이다 — 서버로 보낼 때 뺀다. 줄 순서를 열쇠로 쓰면
 * 가운데를 뺐을 때 뒤 줄이 앞 줄의 DOM 을 물려받아, 한글을 조합하던 중이면 그 글자가
 * 엉뚱한 줄에 남는다.
 */
export interface 줄 extends EnvRow {
  key: string;
  /** 불러올 때의 키 이름. 계정은 이름으로 이어받아서 이름을 바꾸면 비밀번호가 비워진다 (도메인/인증 §7) */
  원래키: string | null;
  /** null 이면 안 보낸다 — 서버가 지금 비밀번호를 유지한다. 화면은 비밀번호를 받은 적이 없다 (§7 「envs[] 한 줄」) */
  새비밀번호: string | null;
  /** 있던 비밀번호를 지운다. 운영 줄에 잘못 넣은 계정을 뺄 길이다 (도메인/인증 §8.8) */
  비밀번호지움?: boolean;
  /** 역할 계정 편집 상태. 받은 accounts 로 시작한다 */
  역할들: 역할줄[];
}

let 줄번호 = 0;
function 새줄키(): string {
  줄번호 += 1;
  // 사람에게 안 보이는 DOM 열쇠라 번역 대상이 아니다. 한국어를 빼 둔다 (messages.test.ts 가 템플릿 속 한국어를 막는다)
  return `env-${String(줄번호)}`;
}

export const 줄로 = (envs: EnvRow[]): 줄[] =>
  envs.map((it) => ({ ...it, key: 새줄키(), 원래키: it.env, 새비밀번호: null, 역할들: 역할줄로(it.accounts ?? []) }));

/**
 * 서버로 보낼 줄. **아이디는 받은 대로 되돌려 보내고 비밀번호는 새로 넣었을 때만 싣는다** —
 * 안 실으면 서버가 지금 것을 유지한다 (도메인/인증 §7).
 * **새로 더한 줄은 빈 칸을 null 로 명시한다.** 같은 이름의 줄을 빼고 다시 더해 한 번에 저장하면
 * 키가 없는 칸을 서버가 옛 값으로 되살린다 — 화면은 빈 칸인데 저장은 옛 계정이 된다
 */
export const 보낼모양 = (줄들: 줄[]): EnvInput[] =>
  줄들.map(({ env, baseUrl, loginId, 새비밀번호, 원래키, 비밀번호지움, isProd, accounts, 역할들 }) => {
    const 새줄 = 원래키 === null;
    const 새값 = 새비밀번호 !== null && 새비밀번호 !== '' ? 새비밀번호 : null;
    return {
      env,
      baseUrl,
      ...(loginId !== undefined ? { loginId } : 새줄 ? { loginId: null } : {}),
      ...(새값 !== null ? { loginPassword: 새값 } : 비밀번호지움 === true || 새줄 ? { loginPassword: null } : {}),
      // 운영 표시 · 역할 목록도 같은 까닭으로 새 줄은 명시한다. 받은 것은 되돌려 보낸다 — 역할 비밀번호는 서버가 이름으로 이어받는다
      ...(isProd !== undefined ? { isProd } : 새줄 ? { isProd: 운영이름인가(env) } : {}),
      ...(새줄 || accounts !== undefined || 역할들.length > 0 ? { accounts: 역할들.map(역할보낼모양) } : {}),
    };
  });

/**
 * 비밀번호가 있던 줄의 이름을 바꿨나. 새 비밀번호를 안 넣었으면 저장 때 비워진다고 미리 알린다 (도메인/인증 §8.8).
 * 역할 계정 비밀번호도 env 이름으로 이어받아서 같이 비워진다
 */
const 이름바꿈 = (it: 줄): boolean => {
  const 남는다 = (r: { hasLoginPassword?: boolean; 비밀번호지움?: boolean; 새비밀번호: string | null }) =>
    r.hasLoginPassword === true && r.비밀번호지움 !== true && (r.새비밀번호 === null || r.새비밀번호 === '');
  return it.원래키 !== null && it.env !== it.원래키 && (남는다(it) || it.역할들.some(남는다));
};

/** 대상 서버는 여러 줄이다. 환경변수 한 줄로는 서비스가 셋만 되어도 안 들어간다 (SPEC §8.8) */
/** 「대상 서버」 구획 안에 선다 — 구획 제목이 칸 이름을 이미 말해 라벨 열 없이 한 줄을 다 쓴다 (도메인/인증 §8.8) */
export function EnvEditor({ envs, onChange }: { envs: 줄[]; onChange: (next: 줄[]) => void }) {
  const t = use말();
  return (
    <div className="field field-wide">
      <div className="set-envs" role="group" aria-label={t('대상 서버 목록')}>
        {envs.map((it, i) => (
          // 줄을 빼면 뒤 줄이 DOM 을 물려받는다. 값은 state 가 쥐고 있어 안 틀리지만
          // 한글을 조합하는 중에 빼면 조합하던 글자가 엉뚱한 줄에 남는다
          <div className="set-env" key={it.key}>
            <input
              type="text"
              value={it.env}
              placeholder="qa"
              aria-label={t('대상 서버 {번호} 키', { 번호: i + 1 })}
              onChange={(e) => onChange(envs.map((v, k) => (k === i ? { ...v, env: e.target.value } : v)))}
            />
            <input
              type="text"
              value={it.baseUrl}
              placeholder="https://qa.example.com"
              aria-label={t('대상 서버 {번호} 주소', { 번호: i + 1 })}
              onChange={(e) => onChange(envs.map((v, k) => (k === i ? { ...v, baseUrl: e.target.value } : v)))}
            />
            <button
              className="btn ghost"
              aria-label={t('대상 서버 {번호} 빼기', { 번호: i + 1 })}
              onClick={() => onChange(envs.filter((_, k) => k !== i))}
            >
              {t('빼기')}
            </button>
            <label className="check-inline">
              <input
                type="checkbox"
                checked={it.isProd ?? 운영이름인가(it.env)}
                aria-label={t('대상 서버 {번호} 운영 서버', { 번호: i + 1 })}
                onChange={(e) => onChange(envs.map((v, k) => (k === i ? { ...v, isProd: e.target.checked } : v)))}
              />
              {t('운영 서버')}
            </label>
            <계정칸 줄={it} 번호={i + 1} 고친다={(next) => onChange(envs.map((v, k) => (k === i ? next : v)))} />
            <역할계정칸들
              역할들={it.역할들}
              번호={i + 1}
              고친다={(역할들) => onChange(envs.map((v, k) => (k === i ? { ...v, 역할들 } : v)))}
            />
          </div>
        ))}
        <button
          className="btn ghost"
          onClick={() =>
            onChange([...envs, { env: '', baseUrl: '', key: 새줄키(), 원래키: null, 새비밀번호: '', 역할들: [] }])
          }
        >
          {t('줄 더하기')}
        </button>
        {envs.length === 0 ? (
          <div className="hint">{t('하나도 없으면 실행할 때 고를 서버가 없어 실행할 수 없습니다')}</div>
        ) : (
          <div className="hint">{t('테스트 계정은 실행 · 테스트 작성이 로그인할 때 씁니다. 운영 서버는 체크해 두면 작성 · 화면 탐색이 가지 않습니다')}</div>
        )}
      </div>
    </div>
  );
}

/**
 * 한 줄의 일반 회원 계정 — 케이스의 `account` 꼬리표가 없는 칸이 이것을 쓴다 (작성 §3.6 「★ 역할별 계정」).
 * 아이디·비밀번호가 둘 다 있고 운영 서버가 아닌 줄만 작성(역방향 · 반영)이 고를 수 있다.
 * **자동완성을 끈다** — 브라우저가 이 관리 화면의 로그인 비밀번호를 채워 넣으면 플랫폼 계정이 테스트 계정으로 저장된다
 */
function 계정칸({ 줄: it, 번호, 고친다 }: { 줄: 줄; 번호: number; 고친다: (next: 줄) => void }) {
  const t = use말();
  return (
    <div className="set-env-login">
      <span className="field-label">{t('일반 회원')}</span>
      <input
        type="text"
        autoComplete="off"
        value={it.loginId ?? ''}
        placeholder={t('테스트 아이디')}
        aria-label={t('대상 서버 {번호} 테스트 아이디', { 번호 })}
        onChange={(e) => 고친다({ ...it, loginId: e.target.value })}
      />
      <비밀번호칸
        값={it}
        고친다={고친다}
        라벨={{
          칸: t('대상 서버 {번호} 테스트 비밀번호', { 번호 }),
          넣기: t('대상 서버 {번호} 비밀번호 넣기', { 번호 }),
          지우기: t('대상 서버 {번호} 비밀번호 지우기', { 번호 }),
          그대로: t('대상 서버 {번호} 비밀번호 그대로 두기', { 번호 }),
        }}
      />
      {이름바꿈(it) ? (
        <div className="hint">{t('키 이름을 바꾸면 이 줄의 비밀번호가 비워집니다. 저장한 뒤 다시 넣어 주세요')}</div>
      ) : null}
    </div>
  );
}
