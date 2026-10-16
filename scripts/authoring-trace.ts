// 작성 중 빨개진 케이스의 trace.zip 을 몇 줄로 줄이고 까닭을 가른다 (SPEC 도메인/작성 §3.6 「관문이 빨개지면」)
// 자식이 긴 오류 글 대신 실패한 조작 · 그 단계의 API · 콘솔만 읽는다. 푸는 코드는 서버 적재와 같은 파서다
// 실행: npm run trace:summary -- <trace.zip 또는 폴더>…

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { trace가린다, 글가린다 } from '../apps/admin/src/execution/traceIngest.js';
import { trace를푼다, 단계를읽는다, type 단계줄, type 조작줄, type 콘솔줄, type 네트워크줄, type 풀린trace } from '../apps/admin/src/execution/traceParse.js';

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

function 깨짐까닭(오류: string): string {
  if (/strict mode violation/i.test(오류)) return '같은 이름 요소가 여럿';
  if (시간초과.test(오류)) return '기다리다 시간 초과';
  if (/not found|resolved to 0|no element|not attached/i.test(오류)) return '요소를 못 찾음';
  return 첫줄(오류);
}

const 첫줄 = (글: string): string => 글.split('\n').find((l) => l.trim() !== '')?.trim() ?? '';
const 값글 = (v: unknown): string => (v === undefined ? 'undefined' : JSON.stringify(v) ?? String(v)).slice(0, 200);

/**
 * 실패한 첫 단계를 보고 가른다. 서버 오류가 먼저다 — 그 단계에 5xx · 끊김이 있으면 화면이 틀린 게 아니라 서버 · 환경 탓이다.
 * 4xx 는 가르지 않고 근거로만 싣는다 — 입력 오류 케이스는 4xx 가 정상이다
 */
export function 가르기(풀림: 풀린trace, 단계들: readonly 단계줄[]): 실패요약 {
  const 단계 = 단계들.find((s) => s.status === 'FAIL') ?? null;
  const 그단계 = <T extends { seq: number | null }>(x: T): boolean => 단계 === null || x.seq === 단계.seq;
  const 조작들 = 풀림.actions.filter(그단계);
  const 실패조작 = [...조작들].reverse().find((a) => a.error !== null) ?? null;
  const 앞조작 = (실패조작 === null ? 조작들 : 조작들.slice(0, 조작들.indexOf(실패조작))).slice(-3);
  const api = 풀림.network.filter(그단계);
  const 콘솔 = 풀림.console.filter(그단계);
  const 머리 = { 단계, 실패조작, 앞조작, api, 콘솔, 한도의심: null };

  if (단계 === null) return { ...머리, 가름: '모름', 까닭: '실패한 단계가 없다 — 단계 밖(준비 · 테스트 제한 시간)에서 멈췄다' };
  const 서버 = api.find((n) => (n.status ?? 0) >= 500);
  if (서버 !== undefined) return { ...머리, 가름: '서버 오류(5xx)', 까닭: `${n줄(서버)}` };
  const 끊김 = api.find((n) => n.status === null && n.failure !== null);
  if (끊김 !== undefined) return { ...머리, 가름: '끊김', 까닭: `${n줄(끊김)} — ${끊김.failure ?? ''}` };

  const 오류 = 실패조작?.error ?? 단계.error;
  if (오류 !== null) {
    const 넣은 = [...앞조작].reverse().find((a) => 넣기.test(a.title) && a.value !== null && a.value !== 가림);
    const 한도의심 = 시간초과.test(오류) && 넣은 !== undefined ? { target: 넣은.target ?? 넣은.title, 길이: 넣은.value!.length } : null;
    return { ...머리, 가름: '깨짐', 까닭: 깨짐까닭(오류), 한도의심 };
  }
  const 판정 = 단계.failed[0];
  if (판정 !== undefined) {
    return { ...머리, 가름: '값 다름', 까닭: `「${판정.statement}」 기대 ${값글(판정.expected)} · 실제 ${값글(판정.actual)}` };
  }
  return { ...머리, 가름: '모름', 까닭: '단계가 실패했는데 오류 · 판정이 없다' };
}

function 주소(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

const n줄 = (n: 네트워크줄): string => `${n.method} ${주소(n.url)} ${n.status ?? '응답 없음'}`;

/** 자식이 읽을 몇 줄 */
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
  if (요약.콘솔.length > 0) 줄.push(`콘솔: ${요약.콘솔.slice(-3).map((c) => `${c.level} ${첫줄(c.text).slice(0, 200)}`).join(' · ')}`);
  if (요약.한도의심 !== null) {
    줄.push(`한도: ${요약.한도의심.target} 에 ${요약.한도의심.길이}자를 넣고 기다리다 시간 초과 — 기다림을 늘리기 전에 칸 길이를 잰다(4-selector.md 「입력 칸 한도」)`);
  }
  return 줄;
}

/** 경로들에서 trace.zip 을 모은다. 폴더면 그 아래를 다 훑는다 */
export function zip찾기(경로들: readonly string[]): string[] {
  return 경로들.flatMap((p) => {
    const s = statSync(p, { throwIfNoEntry: false });
    if (s === undefined) return [];
    if (s.isFile()) return [p];
    return readdirSync(p, { recursive: true, encoding: 'utf8' })
      .filter((이름) => 이름.endsWith('trace.zip'))
      .map((이름) => join(p, 이름))
      .sort();
  });
}

/** 비밀번호는 PLATFORM_ACCOUNTS 에서 — 자식의 대화에 값이 남지 않게 출력 전에 가린다 */
export function 계정비밀번호(env: NodeJS.ProcessEnv = process.env): string[] {
  try {
    const 줄들 = JSON.parse(env.PLATFORM_ACCOUNTS ?? '[]') as unknown;
    return Array.isArray(줄들)
      ? 줄들.flatMap((x: unknown) => {
          const v = (x as { loginPassword?: unknown } | null)?.loginPassword;
          return typeof v === 'string' && v !== '' ? [v] : [];
        })
      : [];
  } catch {
    return [];
  }
}

export async function 요약하기(zip: Buffer, 비밀: string[]): Promise<string[]> {
  const [풀림, 단계들] = await Promise.all([trace를푼다(zip, { 본문: true }), 단계를읽는다(zip)]);
  return 요약글(가르기(trace가린다(풀림, 비밀), 단계들)).map((l) => 글가린다(l, 비밀));
}

async function 실행(인자: string[]): Promise<number> {
  const 비밀 = 계정비밀번호();
  const zip들 = zip찾기(인자);
  if (zip들.length === 0) {
    console.log(`trace 없음 — ${인자.join(' ') || '(경로 없음)'} 에 trace.zip 이 없다. 빨간 케이스를 --trace on 으로 다시 돌렸는지 본다`);
    return 2;
  }
  for (const 파일 of zip들) {
    console.log(`# ${파일}`);
    try {
      for (const l of await 요약하기(readFileSync(파일), 비밀)) console.log(l);
    } catch (e) {
      console.log(`못 읽음 — ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await 실행(process.argv.slice(2));
}
