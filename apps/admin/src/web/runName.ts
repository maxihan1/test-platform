// 실행명 — 「언제 · 어떻게 · 무엇을」. 서버가 박제한 제목(무엇을)에 시작 시각과 시작 방식을 붙여 보인다 (도메인/실행 §8.7 「실행명」)
// 제목은 DB 에 적힌 그대로 두고 보일 때 조립한다 — 지난 실행도 같은 꼴로 서고, 칸이 따로 있는 표에서는 「무엇을」만 적는다

import type { RunSummary } from './api.js';
import type { 값들, 언어 } from './i18n.js';

type 말 = (키: string, 값?: 값들) => string;
type 방식 = NonNullable<RunSummary['origin']>;

// 한 건 실행도 사람이 건 실행이라 「직접 실행」이다 (2026-11-24 사용자). 표의 「시작 방식」 칸과 거르개가 같은 글자를 쓴다
const 방식글: Record<방식, string> = { MANUAL: '직접 실행', SINGLE: '직접 실행', SCHEDULED: '정기 실행', RERUN: 'Fail 다시 실행', BUILD: '빌드 실행' };

export const 시작방식글 = (origin: RunSummary['origin'], t: 말): string => t(방식글[origin ?? 'MANUAL']);

/** 「11월 23일 14:02」. 올해가 아니면 해를 앞에 붙인다 — 해를 넘긴 실행이 올해 것으로 읽히지 않게 */
export function 시작글(iso: string, 언어: 언어, 지금 = new Date()): string {
  const 때 = new Date(iso);
  return new Intl.DateTimeFormat(언어 === 'en' ? 'en-US' : 'ko-KR', {
    ...(때.getFullYear() === 지금.getFullYear() ? {} : { year: 'numeric' }),
    month: 언어 === 'en' ? 'short' : 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(때);
}

// 서버 `자동제목`(execution/runOrigin.ts)이 짓는 꼴이다. 앞 묶음(1)은 세트 이름이나 「스모크」 — 있으면 ` · ` 로 끝난다
const 다시 = /^RUN (\d+)의 (?:Fail|실패) (\d+)건 다시$/;
const 전체 = /^(.* · )?(기능|UI) 전체 (\d+)건$/;
const 외건 = /^(.* · )?[A-Z][A-Z0-9]{0,11}(?:-[A-Z]{2})?-\d{3} 외 (\d+)건$/;
const 스모크만 = /^스모크 · $/;

/**
 * 박제한 제목에서 「무엇을」만 남긴다 — 시작 방식(「정기 · 」) · 빌드 번호(「빌드 124 · 」)는 칸과 부제가 따로 말한다.
 * 건수 앞에는 종류를 적는다 — 「기능 테스트 전체 208건」 · 「기능 테스트 6건」. 건수만 서면 무엇의 건수인지 안 읽힌다 (2026-11-24 사용자).
 * 「<맨 앞 케이스 번호> 외 N건」의 번호는 그 실행을 대표하지 못해 건수만 남긴다. 세트 이름 · 「스모크」가 앞에 선 줄은 그 이름이 주어라 건수만 붙인다.
 * 모르는 꼴은 그대로 둔다. 케이스 하나 · 프로시저 하나를 돌린 실행은 그 이름이 「무엇을」이다
 */
export function 무엇을(run: Pick<RunSummary, 'title' | 'origin' | 'kind'>, t: 말): string {
  const { title, origin } = run;
  const 다시맞음 = origin === 'RERUN' ? 다시.exec(title) : null;
  if (다시맞음 !== null) return t('RUN {번호}의 {수}건', { 번호: 다시맞음[1]!, 수: 다시맞음[2]! });
  let 몸 = title;
  if (origin === 'BUILD') 몸 = 몸.replace(/^빌드 \S+ · /, '');
  if (origin === 'SCHEDULED') 몸 = 몸.replace(/^정기 · /, '');
  const 전체맞음 = 전체.exec(몸);
  if (전체맞음 !== null) {
    return (전체맞음[1] ?? '') + t(전체맞음[2] === 'UI' ? 'UI 테스트 전체 {수}건' : '기능 테스트 전체 {수}건', { 수: 전체맞음[3]! });
  }
  const 외맞음 = 외건.exec(몸);
  if (외맞음 === null) return 몸;
  const 앞 = 외맞음[1] ?? '';
  const 수 = Number(외맞음[2]) + 1;
  if (앞 === '') return t(run.kind === 'UI' ? 'UI 테스트 {수}건' : '기능 테스트 {수}건', { 수 });
  if (스모크만.test(앞)) return t('스모크 {수}건', { 수 });
  return 앞 + t('{수}건§실행명', { 수 });
}

/** 결과 화면 머리처럼 제목 혼자 서는 자리의 실행명 */
export function 실행명(run: Pick<RunSummary, 'title' | 'origin' | 'kind' | 'startedAt'>, 언어: 언어, t: 말): string {
  return [시작글(run.startedAt, 언어), 시작방식글(run.origin, t), 무엇을(run, t)].join(' · ');
}
