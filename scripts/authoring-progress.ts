// 자식이 도는 동안의 진척 — 흐름 줄 누적 · 파일 세기 · 30초 신호 · 끝낼 상태 판정 (도메인/작성 §7 「중단 · 폐기 · 진척」)
// 5871 이 「케이스를 만드는 중」 한 줄로 45분을 보냈고 멈출 길이 없었다. 신호의 응답이 사람의 멈춤을 싣고 온다

import { existsSync, readdirSync } from 'node:fs';

import { type 보고손, 도는자식, 멈춤 } from './authoring-io.js';
import type { 돌린결과 } from './authoring-spawn.js';
import { 읽기, 흘릴줄 } from './authoring-usage.js';

/** 서버가 가두는 progress 모양 그대로다 — 모르는 칸을 더하면 400 BAD_PROGRESS */
export interface 진척 {
  childRunning: boolean;
  elapsedSec: number;
  limitSec: number;
  caseFiles: number;
  tokens: number;
  screens?: number;
  lastAction?: string;
  lastActionAt?: string;
}

const 수 = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function 진척누적기(limitSec: number) {
  // 같은 메시지가 콘텐츠 블록마다 되풀이되고 앞 사본의 출력은 중간값이다 — 흐름풀기 와 같은 까닭으로 마지막 사본만
  const 턴 = new Map<string, number>();
  let 마지막: { 글: string; 때: string } | null = null;
  return {
    /** 줄 하나를 먹고, 로그에 흘릴 글을 돌려준다 — 로그와 진척이 같은 줄을 본다 */
    먹기(줄: string): string | null {
      const e = 읽기(줄);
      const m = e?.type === 'assistant' ? e.message : undefined;
      if (m?.id !== undefined && m.usage !== undefined)
        턴.set(m.id, 수(m.usage.input_tokens) + 수(m.usage.output_tokens));
      const 글 = 흘릴줄(줄);
      if (글 !== null) 마지막 = { 글: 글.slice(0, 160), 때: new Date().toISOString() };
      return 글;
    },
    스냅샷(잰것: { elapsedSec: number; caseFiles: number; screens?: number }): 진척 {
      let tokens = 0;
      for (const n of 턴.values()) tokens += n;
      return {
        childRunning: true,
        ...잰것,
        limitSec,
        tokens,
        ...(마지막 === null ? {} : { lastAction: 마지막.글, lastActionAt: 마지막.때 }),
      };
    },
  };
}

/** 폴더 아래 .spec.ts 전부(상대 경로). 새 서비스면 폴더가 아직 없다 */
export function 케이스파일들(폴더: string): Set<string> {
  if (!existsSync(폴더)) return new Set();
  return new Set(readdirSync(폴더, { recursive: true, encoding: 'utf8' }).filter((p) => p.endsWith('.spec.ts')));
}

/** 자식 시작 때 본 목록에 없던 것 — 고친 옛 케이스는 안 센다 */
export function 새케이스수(폴더: string, 전: Set<string>): number {
  let n = 0;
  for (const p of 케이스파일들(폴더)) if (!전.has(p)) n += 1;
  return n;
}

/** 역방향이 본 화면 수 — 자식이 화면마다 .md 하나를 적는다 (authoring-reverse 의 프롬프트) */
export function 화면수(폴더: string): number {
  return existsSync(폴더) ? readdirSync(폴더).filter((p) => p.endsWith('.md')).length : 0;
}

/** 자식을 띄우기 직전에 부른다 — 이때 본 케이스는 옛것이고 이때부터 시간을 잰다. 화면 폴더는 역방향만 준다 */
export function 진척재기(누적: ReturnType<typeof 진척누적기>, 케이스폴더: string, 화면폴더?: string): () => 진척 {
  const 전 = 케이스파일들(케이스폴더);
  const 시작 = Date.now();
  return () =>
    누적.스냅샷({
      elapsedSec: Math.floor((Date.now() - 시작) / 1000),
      caseFiles: 새케이스수(케이스폴더, 전),
      ...(화면폴더 === undefined ? {} : { screens: 화면수(화면폴더) }),
    });
}

/** 자식이 끝난 모양으로 끝낼 몸을 고른다. null 이면 올린다. 못 띄운 것(안떴다)은 부르는 쪽이 먼저 거른다 */
export function 끝낼상태(
  r: Pick<돌린결과, '코드' | '시간초과' | '멈춤으로죽음'>,
  한도: boolean,
): Record<string, unknown> | null {
  if (r.멈춤으로죽음) return { status: 'STOPPED', stopReason: 'USER' };
  if (r.시간초과) return { status: 'STOPPED', stopReason: 'TIMEOUT' };
  if (r.코드 === 0) return null;
  if (한도) return { status: 'STOPPED', stopReason: 'LIMIT' };
  return {
    status: 'FAILED',
    error: '케이스를 만들다 멈췄다. 에이전트 기록을 봐라.',
  };
}

/** stage 응답(`부른다` 의 답)에 멈추라는 말이 있나 */
export function 멈추라했나(답: unknown): boolean {
  if (typeof 답 !== 'object' || 답 === null) return false;
  const 몸 = (답 as { 몸?: unknown }).몸;
  return typeof 몸 === 'object' && 몸 !== null && (몸 as { stop?: unknown }).stop === true;
}

/**
 * 자식을 돌리는 동안 `간격` 마다 진척을 올린다. 응답이 stop 이면 멈출 신호를 보낸다.
 * 신호 하나를 못 보낸 것으로 작업을 깨지 않는다 — 거절(401·403)만 줄 돌기처럼 에이전트를 멈춘다
 */
export async function 진척보며돌린다(
  손: 보고손,
  재기: () => 진척,
  돌리기: (신호: AbortSignal) => Promise<돌린결과>,
  간격 = 30_000,
): Promise<돌린결과> {
  const 멈출 = new AbortController();
  let 떠있음 = false;
  const 틱 = setInterval(() => {
    // 서버가 느리면 틱이 쌓여 같은 신호를 겹쳐 보낸다
    if (떠있음) return;
    떠있음 = true;
    void (async () => {
      try {
        if (멈추라했나(await 손.단계('케이스를 만드는 중', 재기()))) 멈출.abort();
      } catch (err) {
        const 글 = err instanceof Error ? err.message : String(err);
        if (글.includes('서버가 거절했다')) {
          멈춤.까닭 = 글;
          멈출.abort();
          for (const 자식 of 도는자식) 자식.kill('SIGKILL');
        } else console.error(`[남김] 진척을 못 올렸다: ${글}`);
      } finally {
        떠있음 = false;
      }
    })();
  }, 간격);
  try {
    return await 돌리기(멈출.signal);
  } finally {
    clearInterval(틱);
  }
}
