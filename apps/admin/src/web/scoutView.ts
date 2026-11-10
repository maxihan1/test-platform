// Scout 창의 그리기 판단 — 답 글을 문단 · 목록으로 풀고, 링크 꼴 넷만 화면 주소로 바꾸고, 진행 줄 글을 짓는다 (도메인/챗봇 §8.18)

import type { 값들 } from './i18n.js';
import { 케이스주소 } from './route.js';

export type 질문상태 = 'QUEUED' | 'RUNNING' | 'DONE' | 'STOPPED' | 'TIMEOUT' | 'FAILED';
export interface 단계 {
  tool: string;
  ref?: string;
  done: boolean;
}
export interface 질문 {
  id: number;
  text: string;
  status: 질문상태;
  createdAt: string;
  answer: string;
  steps: 단계[];
  lastSeq: number;
}

export const 끝났나 = (s: 질문상태): boolean => s !== 'QUEUED' && s !== 'RUNNING';

/** 화면 키 → 왼쪽 메뉴 주소. 키 목록의 정본은 scripts/authoring-chat-prompt.ts `화면키` 다 (§3.14 「링크 꼴」) */
const 화면주소: Record<string, string> = {
  prd: '#/prd',
  authoring: '#/authoring',
  cases: '#/cases',
  scenarios: '#/scenarios',
  runs: '#/runs',
  perf: '#/perf/scenarios',
};

// 실행 결과 화면은 종류마다 다르다. UI · FN · E2E · 모르는 케이스 실행은 실행 결과 화면이 스스로 가른다(알림 링크와 같다 — noticeView 열기주소).
// 호환성은 결과 화면이 따로고, 성능 셋은 성능 실행 화면이 페이지 · 기기 측정이면 그 화면으로 옮긴다(PerfRun)
const 실행자리: Record<string, string> = {
  UI: '#/runs/',
  FN: '#/runs/',
  SCENARIO: '#/runs/',
  CASE_RUN: '#/runs/',
  COMPAT: '#/compat/runs/',
  PERF_LOAD: '#/perf/runs/',
  PERF_PAGE: '#/perf/runs/',
  PERF_DEVICE: '#/perf/runs/',
};

/**
 * AI 가 쓴 링크 대상을 화면 주소로. 네 꼴(run · case · issue · screen)이 아니면 null — 링크 없이 글로 그린다.
 * 이슈 본문 · 노트에 심은 지시가 AI 답에 엉뚱한 주소(http · #/)를 넣어도 눌리지 않게 한다 (§3.14 「링크 꼴」)
 */
export function 링크주소(대상: string, btsUrl: string | null): string | null {
  const 실행 = /^run\/([A-Z_]+)\/([1-9]\d{0,9})$/.exec(대상);
  if (실행 !== null) return 실행자리[실행[1]!] === undefined ? null : 실행자리[실행[1]!]! + 실행[2]!;
  const 케이스 = /^case\/([A-Z][A-Z0-9]{0,11}-[A-Z0-9-]{1,40})$/.exec(대상);
  if (케이스 !== null) return 케이스주소(케이스[1]!);
  const 이슈 = /^issue\/([A-Z][A-Z0-9_]{0,19}-\d{1,9})$/.exec(대상);
  if (이슈 !== null) return btsUrl === null ? null : `${btsUrl}/issues/${encodeURIComponent(이슈[1]!)}`;
  const 화면 = /^screen\/([a-z]+)$/.exec(대상);
  return 화면 === null ? null : (화면주소[화면[1]!] ?? null);
}

export type 글조각 = { 글: string; 주소?: string; 굵게?: boolean; 코드?: boolean };
export type 덩이 = { 꼴: 'para'; 줄: 글조각[] } | { 꼴: 'list'; rows: { 배지: string | null; 글: 글조각[] }[] };

/** 한 줄 안의 링크 · 굵게 · 코드만 푼다. 나머지 마크다운 기호는 글자 그대로 둔다 */
export function 줄풀기(줄: string, btsUrl: string | null): 글조각[] {
  const 조각들: 글조각[] = [];
  // 역따옴표는 \x60 으로 적는다 — 화면 글자 훑개(messages.test.ts)가 정규식 안의 역따옴표를 템플릿 문자열로 읽는다
  const 꼴 = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|\x60([^\x60\n]+)\x60/g;
  let 앞 = 0;
  for (const m of 줄.matchAll(꼴)) {
    if (m.index > 앞) 조각들.push({ 글: 줄.slice(앞, m.index) });
    if (m[1] !== undefined) {
      const 주소 = 링크주소(m[2]!, btsUrl);
      조각들.push(주소 === null ? { 글: m[1] } : { 글: m[1], 주소 });
    } else if (m[3] !== undefined) 조각들.push({ 글: m[3], 굵게: true });
    else 조각들.push({ 글: m[4]!, 코드: true });
    앞 = m.index + m[0].length;
  }
  if (앞 < 줄.length) 조각들.push({ 글: 줄.slice(앞) });
  return 조각들;
}

const 표줄 = /^\s*\|.*\|\s*$/;
const 표가름 = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const 목록줄 = /^\s*(?:[-*•]|\d{1,3}[.)])\s+(.*)$/;
// `- [회귀 실패] MKW-FN-001 · …` — 대괄호 뒤에 ( 가 없으면 링크가 아니라 구분 배지다 (지시문 「[구분] 번호 · 짧은 설명」)
const 배지꼴 = /^\[([^\]\n]{1,12})\](?!\()\s*/;

/**
 * 답 글을 문단과 목록으로. 표는 그리지 않는다 — 줄마다 `칸 · 칸 · 칸` 한 줄 목록으로 풀고 머리 줄은 버린다 (결정 14).
 * 쓰는 도중의 조각도 같은 함수로 다시 푼다 — 다 오기 전 표 한 줄도 목록 한 줄로 보인다
 */
export function 답풀기(답: string, btsUrl: string | null): 덩이[] {
  const 덩이들: 덩이[] = [];
  const 줄들 = 답.replace(/\r\n?/g, '\n').split('\n');
  const 목록에 = (배지: string | null, 글: string) => {
    const 끝 = 덩이들.at(-1);
    const 줄 = { 배지, 글: 줄풀기(글, btsUrl) };
    if (끝?.꼴 === 'list') 끝.rows.push(줄);
    else 덩이들.push({ 꼴: 'list', rows: [줄] });
  };
  let 문단: string[] = [];
  const 문단닫기 = () => {
    if (문단.length > 0) 덩이들.push({ 꼴: 'para', 줄: 줄풀기(문단.join(' '), btsUrl) });
    문단 = [];
  };
  줄들.forEach((줄, i) => {
    if (표가름.test(줄) && 줄.includes('-')) return;
    if (표줄.test(줄)) {
      문단닫기();
      // 다음 줄이 가름 줄이면 이 줄은 머리다
      if (표가름.test(줄들[i + 1] ?? '') && (줄들[i + 1] ?? '').includes('-')) return;
      const 칸들 = 줄.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()).filter((c) => c !== '');
      목록에(null, 칸들.join(' · '));
      return;
    }
    const 목록 = 목록줄.exec(줄);
    if (목록 !== null) {
      문단닫기();
      const 배지 = 배지꼴.exec(목록[1]!);
      목록에(배지?.[1] ?? null, 배지 === null ? 목록[1]! : 목록[1]!.slice(배지[0].length));
      return;
    }
    const 글 = 줄.replace(/^\s*#{1,6}\s+/, '').trim();
    if (글 === '') 문단닫기();
    else 문단.push(글);
  });
  문단닫기();
  return 덩이들;
}

/** 구분 배지의 색 — 판정 낱말을 화면 다른 곳과 같은 색으로 (회귀 실패 · 실패는 빨강, 해결 · 통과는 초록, 나머지는 회색) */
export function 배지색(배지: string): 'fail' | 'pass' | 'na' {
  if (배지 === '기존 실패') return 'na';
  if (배지.includes('실패')) return 'fail';
  if (배지 === '해결' || 배지 === '통과') return 'pass';
  return 'na';
}

/**
 * 진행 줄 글 — 도구 이름으로 짓는다 (§8.18 「진행 줄」). 도는 줄은 「하는 중」이 붙은 키다.
 * 키를 둘씩 두는 까닭 — 영어 표가 「확인 → checking」처럼 꼴째 다르게 옮긴다
 */
export function 단계글(s: 단계, t: (키: string, 값?: 값들) => string): string {
  const 번호 = s.ref !== undefined && /^\d{1,10}$/.test(s.ref) ? { 번호: s.ref } : null;
  const 끝 = s.done;
  switch (s.tool) {
    case 'run_result':
    case 'e2e_result':
    case 'compat_result':
      if (번호 !== null) return 끝 ? t('실행 #{번호} 결과 확인', 번호) : t('실행 #{번호} 결과 확인하는 중', 번호);
      break;
    case 'perf_result':
      if (번호 !== null) return 끝 ? t('성능 실행 #{번호} 결과 확인', 번호) : t('성능 실행 #{번호} 결과 확인하는 중', 번호);
      break;
    case 'run_list':
    case 'run_search':
      return 끝 ? t('최근 실행 검색') : t('최근 실행 검색하는 중');
    case 'issue_list':
    case 'bts_search':
      return 끝 ? t('이슈 검색') : t('이슈 검색하는 중');
    case 'prd_search':
      return 끝 ? t('PRD 검색') : t('PRD 검색하는 중');
    case 'map_search':
      return 끝 ? t('케이스 검색§Scout') : t('케이스 검색하는 중');
    case 'note_read':
      return 끝 ? t('프로젝트 노트 확인') : t('프로젝트 노트 확인하는 중');
  }
  return 끝 ? t('데이터 확인') : t('데이터 확인하는 중');
}

/** 이어 받은 조각 하나를 질문에 붙인다. STEP_DONE 은 같은 도구의 아직 안 끝난 첫 줄을 끝낸다 (§7 stream) */
export function 조각붙이기(q: 질문, seq: number, kind: string, body: unknown): 질문 {
  // 다시 붙을 때 이미 받은 번호가 또 올 수 있다 — 두 번 붙이지 않는다
  if (seq <= q.lastSeq) return q;
  const 다음 = { ...q, lastSeq: seq, status: q.status === 'QUEUED' ? ('RUNNING' as const) : q.status };
  if (kind === 'TEXT' && typeof body === 'string') return { ...다음, answer: q.answer + body };
  if (typeof body !== 'object' || body === null || typeof (body as 단계).tool !== 'string') return 다음;
  const { tool, ref } = body as 단계;
  if (kind === 'STEP') return { ...다음, steps: [...q.steps, { tool, ...(typeof ref === 'string' ? { ref } : {}), done: false }] };
  if (kind !== 'STEP_DONE') return 다음;
  const i = q.steps.findIndex((s) => s.tool === tool && !s.done);
  return i === -1 ? 다음 : { ...다음, steps: q.steps.map((s, j) => (j === i ? { ...s, done: true } : s)) };
}
