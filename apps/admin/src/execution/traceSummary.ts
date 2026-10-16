// 빨개진 케이스의 trace 를 몇 줄로 줄이고 까닭을 가른다 (SPEC 도메인/작성 §3.6 「관문이 빨개지면」)
// 작성 자식의 요약 스크립트(scripts/authoring-trace.ts)와 화면이 맞음 건의 에이전트 통로가 같이 쓴다. 가림은 서버 적재와 같은 함수다

import JSZip from 'jszip';

import { trace가린다, 글가린다 } from './traceIngest.js';
import { trace를푼다, 단계를읽는다, type 단계줄, type 조작줄, type 콘솔줄, type 네트워크줄, type 풀린trace } from './traceParse.js';

export type 가름 = '깨짐' | '값 다름' | '서버 오류(5xx)' | '끊김' | '모름';

export interface 실패요약 {
  가름: 가름;
  까닭: string;
  단계: 단계줄 | null;
  실패조작: 조작줄 | null;
  앞조작: 조작줄[];
  api: 네트워크줄[];
  콘솔: 콘솔줄[];
  // 한도 + 1 을 넣고 기다리다 시간 초과 — 칸이 막았을 수 있다. 기다림을 늘리기 전에 잰다
  한도의심: { target: string; 길이: number } | null;
}

const 시간초과 = /timeout|timed out|시간 초과/i;
const 넣기 = /^(fill|type|press ?sequentially)\b/i;
const 가림 = '********';
// 가린 뒤에 자른다 — 먼저 자르면 잘린 자리에 걸친 비밀값 조각이 가림 무늬에 안 걸린다
const 줄상한 = 500;

function 깨짐까닭(오류: string): string {
  if (/strict mode violation/i.test(오류)) return '같은 이름 요소가 여럿';
  if (시간초과.test(오류)) return '기다리다 시간 초과';
  if (/not found|resolved to 0|no element|not attached/i.test(오류)) return '요소를 못 찾음';
  return 첫줄(오류);
}

const 첫줄 = (글: string): string => 글.split('\n').find((l) => l.trim() !== '')?.trim() ?? '';
const 값글 = (v: unknown): string => (v === undefined ? 'undefined' : (JSON.stringify(v) ?? String(v)));
const n줄 = (n: 네트워크줄): string => `${n.method} ${주소(n.url)} ${n.status ?? '응답 없음'}`;

function 주소(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

/**
 * 실패한 첫 단계를 보고 가른다.
 * 판정(verify)만 틀린 단계는 값 다름이다 — 그 안에서 케이스가 잡아 삼킨 조작 오류(없을 수도 있는 팝업 닫기)는 까닭이 아니다.
 * 서버 오류 · 끊김은 실패한 때까지 난 것만 보고, 그 뒤 같은 요청이 다시 성공했으면 뺀다 — 상관없는 요청 하나로 고칠 수 있는 케이스를 보류로 보내지 않게.
 * 4xx 는 가르지 않고 근거로만 싣는다 — 입력 오류 케이스는 4xx 가 정상이다
 */
export function 가르기(풀림: 풀린trace, 단계들: readonly 단계줄[]): 실패요약 {
  const 단계 = 단계들.find((s) => s.status === 'FAIL') ?? null;
  const 그단계 = <T extends { seq: number | null }>(x: T): boolean => 단계 === null || x.seq === 단계.seq;
  const 조작들 = 풀림.actions.filter(그단계);
  const 실패조작 = 단계 === null || 단계.error === null ? null : ([...조작들].reverse().find((a) => a.error !== null) ?? null);
  const 앞조작 = (실패조작 === null ? 조작들 : 조작들.slice(0, 조작들.indexOf(실패조작))).slice(-3);
  const api = 풀림.network.filter(그단계);
  const 콘솔 = 풀림.console.filter(그단계);
  const 머리 = { 단계, 실패조작, 앞조작, api, 콘솔, 한도의심: null };

  if (단계 === null) return { ...머리, 가름: '모름', 까닭: '실패한 단계가 없다 — 단계 밖(준비 · 테스트 제한 시간)에서 멈췄다' };
  const 실패때 = 실패조작 === null ? Infinity : 실패조작.atMs + (실패조작.durationMs ?? 0);
  const 다시됨 = (n: 네트워크줄): boolean => api.some((m) => m.atMs > n.atMs && m.method === n.method && m.url === n.url && m.status !== null && m.status < 400);
  const 탓 = api.filter((n) => n.atMs <= 실패때 && !다시됨(n));
  const 서버 = 탓.find((n) => (n.status ?? 0) >= 500);
  if (서버 !== undefined) return { ...머리, 가름: '서버 오류(5xx)', 까닭: n줄(서버) };
  const 끊김 = 탓.find((n) => n.status === null && n.failure !== null);
  if (끊김 !== undefined) return { ...머리, 가름: '끊김', 까닭: `${n줄(끊김)} — ${끊김.failure ?? ''}` };

  const 판정 = 단계.failed[0];
  if (단계.error === null && 판정 !== undefined) {
    return { ...머리, 가름: '값 다름', 까닭: `「${판정.statement}」 기대 ${값글(판정.expected)} · 실제 ${값글(판정.actual)}` };
  }
  const 오류 = 실패조작?.error ?? 단계.error;
  if (오류 !== null) {
    const 넣은 = [...앞조작].reverse().find((a) => 넣기.test(a.title) && a.value !== null && a.value !== 가림);
    const 한도의심 = 시간초과.test(오류) && 넣은 !== undefined ? { target: 넣은.target ?? 넣은.title, 길이: 넣은.value!.length } : null;
    return { ...머리, 가름: '깨짐', 까닭: 깨짐까닭(오류), 한도의심 };
  }
  return { ...머리, 가름: '모름', 까닭: '단계가 실패했는데 오류 · 판정이 없다' };
}

/** 자식이 읽을 몇 줄. 자르기 전이다 — 요약줄들이 가린 뒤에 자른다 */
export function 요약글(요약: 실패요약): string[] {
  const 줄: string[] = [`가름: ${요약.가름} — ${요약.까닭}`];
  if (요약.단계 !== null) 줄.push(`단계 ${요약.단계.seq} 「${요약.단계.title}」`);
  if (요약.실패조작 !== null) 줄.push(`실패 조작: ${요약.실패조작.title} — ${첫줄(요약.실패조작.error ?? '')}`);
  if (요약.앞조작.length > 0) 줄.push(`앞 조작: ${요약.앞조작.map((a) => a.title).join(' · ')}`);
  const 화면api = 요약.api.filter((n) => n.resourceType !== 'document');
  const 사백 = 화면api.filter((n) => n.status !== null && n.status >= 400 && n.status < 500);
  const 나머지 = 화면api.filter((n) => !사백.includes(n));
  if (나머지.length > 0) 줄.push(`API: ${나머지.slice(-8).map(n줄).join(' · ')}`);
  if (사백.length > 0) 줄.push(`4xx(근거로만 — 입력 오류 케이스는 정상): ${사백.map(n줄).join(' · ')}`);
  if (요약.콘솔.length > 0) 줄.push(`콘솔: ${요약.콘솔.slice(-3).map((c) => `${c.level} ${첫줄(c.text)}`).join(' · ')}`);
  if (요약.한도의심 !== null) {
    줄.push(`한도: ${요약.한도의심.target} 에 ${요약.한도의심.길이}자를 넣고 기다리다 시간 초과 — 기다림을 늘리기 전에 칸 길이를 잰다(tpx-cases 4-selector.md 「입력 칸 한도」)`);
  }
  return 줄;
}

/** zip 하나를 풀어 가르고, 가린 뒤 자른 줄로. 비밀은 값 목록이다 — 서버는 항목비밀, 작성 자식은 계정 비밀번호 */
export async function 요약줄들(zip: Buffer, 비밀: string[]): Promise<string[]> {
  const 묶음 = await JSZip.loadAsync(zip);
  const [풀림, 단계들] = await Promise.all([trace를푼다(묶음, { 본문: true }), 단계를읽는다(묶음)]);
  return 요약글(가르기(trace가린다(풀림, 비밀), 단계들)).map((l) => 글가린다(l, 비밀).slice(0, 줄상한));
}
