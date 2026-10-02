// 자식이 도는 동안의 진척 — 흐름 줄 누적 · 파일 세기 · 끝낼 상태 판정 (30초 신호는 authoring-heartbeat) (도메인/작성 §7 「중단 · 폐기 · 진척」)
// 5871 이 「케이스를 만드는 중」 한 줄로 45분을 보냈고 멈출 길이 없었다. 신호의 응답이 사람의 멈춤을 싣고 온다

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { 돌린결과 } from './authoring-spawn.js';
import { 사유거르기 } from './authoring-reverse.js';
import { 글자자르기, 읽기, 흘릴줄 } from './authoring-usage.js';

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

/** 자식 한 번의 제한. 60분이던 때 5872 가 관문 2 에서 걸려 결과를 잃었다. 이어하기가 생긴 뒤에도 120분 — 한 번에 끝날 확률이 높고, 이어갈 때마다 파일을 다시 읽는다 (작성 §7 TIMEOUT) */
export const 자식제한 = 120 * 60_000;

const 수 = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** 진척·로그로 나가기 전에 가릴 원문. 자식은 둘 다 환경에 들고 있어 글에 그대로 적을 수 있다 */
export interface 가릴것 {
  loginPassword?: string | null;
  figmaToken?: string;
}

function 가리기(글: string, 비밀: 가릴것): string {
  const 토큰 = 비밀.figmaToken;
  // 짧은 값은 아무 글에나 걸린다 — 올릴 것 검사(비밀섞였나)와 같은 8자 하한
  const 토큰뺀 = 토큰 !== undefined && 토큰.length >= 8 ? 글.split(토큰).join('***') : 글;
  return 사유거르기(토큰뺀, 비밀.loginPassword);
}

/** 시간을 `분:초` 로 — 120분 제한이라 시는 안 쓴다 */
const 분초 = (ms: number) => {
  const 초 = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(초 / 60)}:${String(초 % 60).padStart(2, '0')}`;
};

// 0점(지금())은 누적기를 만든 때 — 자식을 띄우기 직전이다
export function 진척누적기(limitSec: number, 비밀: 가릴것 = {}, 지금: () => number = Date.now) {
  // 같은 메시지가 콘텐츠 블록마다 되풀이되고 앞 사본의 출력은 중간값이다 — 흐름풀기 와 같은 까닭으로 마지막 사본만
  const 턴 = new Map<string, number>();
  let 마지막: { 글: string; 때: string } | null = null;
  // 단계 표지 — 어느 단계가 가장 긴지 재려고 에이전트 시계로 찍는다 (AUT-F3-21 · tpx-author 「단계 표지」)
  const 시작 = 지금();
  const 단계들: { 이름: string; 때: number }[] = [];
  return {
    /** 줄 하나를 먹고, 로그에 흘릴 글을 돌려준다. 새 단계 표지면 그 줄을 — lastAction 은 늘 글 첫 줄이다(작성 §7) */
    먹기(줄: string): string | null {
      const e = 읽기(줄);
      const m = e?.type === 'assistant' ? e.message : undefined;
      if (m?.id !== undefined && m.usage !== undefined)
        턴.set(m.id, 수(m.usage.input_tokens) + 수(m.usage.output_tokens) + 수(m.usage.cache_read_input_tokens));
      const 날글 = 흘릴줄(줄);
      if (날글 === null) return null;
      const 글 = 가리기(날글, 비밀);
      마지막 = { 글: 글자자르기(글, 160), 때: new Date().toISOString() };
      // 자식 줄도 parent_tool_use_id: null 을 단다 — 칸이 있는지로 거르면 다 버린다. 서브에이전트 줄은 값이 문자열이다
      if (typeof (e as { parent_tool_use_id?: unknown }).parent_tool_use_id === 'string') return 글;
      // 로그 줄은 글 첫 줄을 지키고 새 표지를 뒤에 붙인다 — 첫 줄이 곧 표지면 두 번 싣지 않는다
      let 로그 = 글;
      for (const c of m?.content ?? [])
        for (const 한줄 of c.type === 'text' && c.text ? c.text.split('\n') : []) {
          const 찾음 = /^\[단계\]\s*(.+?)\s*$/.exec(한줄);
          if (찾음 === null) continue;
          // 가림 안내문이 이름 자리에 들어가 표에 엉뚱한 단계로 남지 않게 — 가린 이름은 짧게
          const 이름 = 가리기(찾음[1]!, 비밀) === 찾음[1] ? 글자자르기(찾음[1]!, 60) : '(가림)';
          if (단계들.at(-1)?.이름 === 이름) continue;
          단계들.push({ 이름, 때: 지금() });
          if (!로그.endsWith(`[단계] ${이름}`)) 로그 += ` [단계] ${이름}`;
        }
      return 로그;
    },
    /** 단계마다 시작(자식 시작부터)과 걸린 시간. 마지막 단계는 지금 끝난 것으로 본다. 표지가 없으면 빈 글 */
    단계표(): string {
      if (단계들.length === 0) return '';
      const 끝 = 지금();
      const 줄들 = [{ 이름: '(첫 표지 전)', 때: 시작 }, ...단계들]
        .map((s, i, 다) => ({ ...s, 걸림: (다[i + 1]?.때 ?? 끝) - s.때 }))
        .filter((s, i) => i > 0 || s.걸림 > 0);
      const 가장 = 줄들.reduce((a, b) => (b.걸림 > a.걸림 ? b : a));
      return [
        '| 단계 | 시작 | 걸린 시간 |',
        '|---|---|---|',
        ...줄들.map((s) => `| ${s.이름.replaceAll('|', '\\|')} | ${분초(s.때 - 시작)} | ${분초(s.걸림)} |`),
        '',
        `가장 긴 단계: ${가장.이름} — ${분초(가장.걸림)}`,
      ].join('\n');
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
export function 새케이스수(폴더: string, 전: ReadonlySet<string>): number {
  let n = 0;
  for (const p of 케이스파일들(폴더)) if (!전.has(p)) n += 1;
  return n;
}

/** 역방향이 본 화면 수 — 자식이 화면마다 .md 하나를 적는다 (authoring-reverse 의 프롬프트) */
export function 화면수(폴더: string): number {
  return existsSync(폴더) ? readdirSync(폴더).filter((p) => p.endsWith('.md')).length : 0;
}

/** 자식을 띄우기 직전에 부른다 — 이때 본 케이스는 옛것이고 이때부터 시간을 잰다. 화면 폴더는 역방향만 준다.
 * 케이스는 자식이 쓰는 `tests/<폴더>` 에서 센다 — 트리 바로 아래를 세서 늘 0 이었다 */
export function 진척재기(
  누적: ReturnType<typeof 진척누적기>,
  트리: string,
  폴더: string,
  화면폴더?: string,
  // 처음 사본에 있던 케이스. 이어받은 실행도 앞 실행이 만든 것까지 누적으로 센다 (작성 §7 「이어하기」)
  옛것?: ReadonlySet<string>,
): () => 진척 {
  const 케이스폴더 = join(트리, 'tests', 폴더);
  const 전 = 옛것 ?? 케이스파일들(케이스폴더);
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
  // 일하다 끊긴 것이라 만든 것이 남는다 — 다시 해도 같은 결과(FAILED)가 아니라 이어갈 수 있는 중단이다 (작성 §7)
  return {
    status: 'STOPPED',
    stopReason: 'CRASH',
    error: '케이스를 만들다 끊겼다. 에이전트 기록을 봐라.',
  };
}

/** 올리기에서 막힌 것 — 다 만든 케이스가 남아 거절 까닭만 고치면 이어간다 (작성 §7 REJECTED) */
export function 거절로(까닭: string): Record<string, unknown> {
  return { status: 'STOPPED', stopReason: 'REJECTED', error: 까닭 };
}

/** stage 응답(`부른다` 의 답)에 멈추라는 말이 있나 */
export function 멈추라했나(답: unknown): boolean {
  if (typeof 답 !== 'object' || 답 === null) return false;
  const 몸 = (답 as { 몸?: unknown }).몸;
  return typeof 몸 === 'object' && 몸 !== null && (몸 as { stop?: unknown }).stop === true;
}
