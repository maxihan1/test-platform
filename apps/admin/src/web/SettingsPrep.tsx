// 대상 서버 한 줄의 「테스트 데이터 준비」 칸 — 준비 주소 · 헤더 이름 · 값 · 시간 한도 (도메인/인증 §7 envs[] prep · §8.8 · 도메인/실행 §3.2 「실행 전 준비」)
// SettingsEnvs.tsx 가 300줄에 닿지 않게 뗐다. 값의 가림 · 이어받기는 어드민 키 칸(SettingsAdminKey.tsx)과 같은 규칙이다

import { 운영이름인가 } from '../settings/roles.js';

import type { EnvInput, EnvRow } from './api.js';
import { t as 말, use말, type 언어 } from './i18n.js';

/** 편집 중인 준비 칸. 새값이 null 이면 저장된 값을 잇는다(•••• 끝4) */
export interface 준비편집 {
  열림: boolean;
  url: string;
  header: string;
  새값: string | null;
  timeoutSec: string;
}

interface 준비줄 {
  env: string;
  원래키: string | null;
  isProd?: boolean;
  prep?: EnvRow['prep'];
  준비?: 준비편집;
}

export const 준비편집으로 = (p: EnvRow['prep']): 준비편집 =>
  p == null ? { 열림: false, url: '', header: '', 새값: null, timeoutSec: '120' } : { 열림: true, url: p.url, header: p.header, 새값: null, timeoutSec: String(p.timeoutSec) };

const 편집 = (r: 준비줄): 준비편집 => r.준비 ?? 준비편집으로(r.prep);
const 실서비스 = (r: 준비줄): boolean => r.isProd ?? 운영이름인가(r.env);

/** 저장된 값을 이을 수 있나 — 서버와 같은 규칙이다. 같은 대상 서버 이름 · 같은 주소 · 같은 헤더 이름일 때만 잇는다 */
const 이을수있다 = (r: 준비줄): boolean => {
  const p = 편집(r);
  return r.prep != null && r.원래키 !== null && r.env === r.원래키 && p.url.trim() === r.prep.url && p.header.trim() === r.prep.header;
};

/** 실서비스 서버 줄 · 닫은 칸 · 세 칸이 다 빈 칸은 null 이다(서버가 지운다). 값은 새로 넣었을 때만 싣는다 — 화면은 원문을 받은 적이 없다 */
export function 준비보낼모양(r: 준비줄): EnvInput['prep'] {
  const p = 편집(r);
  const 값 = p.새값 ?? '';
  if (실서비스(r) || !p.열림 || (p.url.trim() === '' && p.header.trim() === '' && 값 === '')) return null;
  return { url: p.url.trim(), header: p.header.trim(), ...(값 === '' ? {} : { value: 값 }), timeoutSec: Number(p.timeoutSec) };
}

/** 값 꼴. 서버 settings/apiService.ts `어드민키값인가` 와 같은 규칙이다 */
const 값꼴 = (값: string): boolean => 값.length >= 12 && 값.length <= 500 && /^[\x21-\x7e]+(?: [\x21-\x7e]{12,})?$/.test(값);

/** 저장을 막을 까닭. 서버 settings/prep.ts `준비틀림` 과 같은 규칙이다 — 서버는 BAD_PREP 하나로만 답해 어느 칸인지 모른다 */
export function 준비못보내는이유(envs: readonly 준비줄[], 언어: 언어): string | null {
  const 보낼것 = envs.flatMap((r) => {
    const 모양 = 준비보낼모양(r);
    return 모양 == null ? [] : [{ r, 모양, 시간: 편집(r).timeoutSec.trim() }];
  });
  if (보낼것.some(({ 모양 }) => !/^https?:\/\/\S+$/.test(모양.url) || 모양.url.length > 1000)) {
    return 말('준비 주소는 http(s) 주소로 1000자까지 입력해 주세요', 언어);
  }
  if (보낼것.some(({ 모양 }) => !/^[A-Za-z0-9-]{1,100}$/.test(모양.header))) return 말('준비 헤더 이름은 영문 · 숫자 · - 로 100자까지입니다', 언어);
  if (보낼것.some(({ 모양 }) => 모양.value !== undefined && !값꼴(모양.value))) {
    return 말('준비 헤더 값은 12자 이상 500자 이하로 입력해 주세요. 띄어쓰기는 가운데 한 칸만 넣을 수 있습니다', 언어);
  }
  if (보낼것.some(({ 시간 }) => !/^\d+$/.test(시간) || Number(시간) < 10 || Number(시간) > 600)) {
    return 말('준비 시간 한도를 10초에서 600초 사이의 정수로 입력해 주세요', 언어);
  }
  if (보낼것.some(({ r, 모양 }) => 모양.value === undefined && !이을수있다(r))) {
    return 말('신규 준비 주소는 헤더 값을 입력해 주세요. 준비 주소 · 헤더 이름이나 대상 서버 이름을 변경하면 다시 넣어야 합니다', 언어);
  }
  return null;
}

/** 한 대상 서버 줄의 준비 칸. 실서비스 서버 줄은 막는다 — 데이터를 초기화하는 주소라서다 (도메인/실행 §3.2) */
export function 준비칸({ 줄: r, 번호, 고친다 }: { 줄: 준비줄; 번호: number; 고친다: (next: 준비편집) => void }) {
  const t = use말();
  const p = 편집(r);
  const 끝넷 = r.prep?.valueLast4 ?? null;
  if (실서비스(r)) {
    return (
      <div className="set-env-login">
        <span className="field-label">{t('테스트 데이터 준비')}</span>
        <span className="hint">{t('실서비스 서버에는 테스트 데이터 준비를 넣을 수 없습니다')}</span>
      </div>
    );
  }
  if (!p.열림) {
    return (
      <div className="set-env-login">
        <span className="field-label">{t('테스트 데이터 준비')}</span>
        <button
          className="btn ghost icon"
          aria-label={t('대상 서버 {번호} 테스트 데이터 준비 추가', { 번호 })}
          title={t('대상 서버 {번호} 테스트 데이터 준비 추가', { 번호 })}
          onClick={() => 고친다({ 열림: true, url: '', header: '', 새값: '', timeoutSec: '120' })}
        >
          +
        </button>
        {r.prep != null ? <div className="hint">{t('이대로 저장하면 이 서버의 테스트 데이터 준비가 삭제됩니다')}</div> : null}
      </div>
    );
  }
  const 값보임 = p.새값 === null && 이을수있다(r);
  return (
    <div className="set-env-login">
      <span className="field-label">{t('테스트 데이터 준비')}</span>
      <input
        type="text"
        autoComplete="off"
        value={p.url}
        placeholder="https://qa.example.com/prep"
        aria-label={t('대상 서버 {번호} 준비 주소', { 번호 })}
        onChange={(e) => 고친다({ ...p, url: e.target.value })}
      />
      <input
        type="text"
        autoComplete="off"
        value={p.header}
        placeholder="X-Prep-Key"
        aria-label={t('대상 서버 {번호} 준비 헤더 이름', { 번호 })}
        onChange={(e) => 고친다({ ...p, header: e.target.value })}
      />
      {값보임 ? (
        <span className="set-hook">
          <span>{`•••• ${끝넷 ?? ''}`}</span>
          <button className="btn ghost" aria-label={t('대상 서버 {번호} 준비 헤더 값 변경', { 번호 })} onClick={() => 고친다({ ...p, 새값: '' })}>
            {t('변경')}
          </button>
        </span>
      ) : (
        <span className="set-hook">
          {/* 자동완성을 끈다 — 브라우저가 이 관리 화면의 로그인 비밀번호를 채워 넣으면 그것이 준비 값으로 저장된다 */}
          <input
            type="password"
            autoComplete="new-password"
            value={p.새값 ?? ''}
            placeholder={t('헤더 값')}
            aria-label={t('대상 서버 {번호} 준비 헤더 값', { 번호 })}
            onChange={(e) => 고친다({ ...p, 새값: e.target.value })}
          />
          {p.새값 !== null && 이을수있다(r) ? (
            <button className="btn ghost" aria-label={t('대상 서버 {번호} 준비 헤더 값 변경 취소', { 번호 })} onClick={() => 고친다({ ...p, 새값: null })}>
              {t('변경 취소')}
            </button>
          ) : null}
        </span>
      )}
      <span className="set-hook">
        <input
          type="number"
          min={10}
          max={600}
          value={p.timeoutSec}
          aria-label={t('대상 서버 {번호} 준비 시간 한도(초)', { 번호 })}
          onChange={(e) => 고친다({ ...p, timeoutSec: e.target.value })}
        />
        <span>{t('초')}</span>
      </span>
      <button
        className="btn ghost icon"
        aria-label={t('대상 서버 {번호} 테스트 데이터 준비 삭제', { 번호 })}
        title={t('대상 서버 {번호} 테스트 데이터 준비 삭제', { 번호 })}
        onClick={() => 고친다(준비편집으로(null))}
      >
        −
      </button>
    </div>
  );
}
