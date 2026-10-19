// 돌려 보기 명령 — 다시 돌릴 케이스를 고르고, 10분 안쪽으로 나눠 차례로 돌린 뒤 빨간 것만 요약한다 (SPEC 도메인/작성 §3.6 「돌려 보기 명령」)
// 자식이 grep 으로 케이스를 모으고 덩어리를 손으로 나누고 기록 번호를 붙이던 일이다. #303 마지막 돌려 보기는 명령 11번 · 기록 읽기 11번이었다
// 실행: npm run authoring:run -- 보조 <묶음> <케이스 파일…> [--mobile]  |  npm run authoring:run -- 마지막 <폴더> [--mobile]

import { spawn } from 'node:child_process';
import { closeSync, openSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { type 돌린판, 돌린기록들, 케이스파일읽기, 살필케이스, 파일상태보기, 판들읽기 } from './authoring-gate3.js';
import { 바뀐파일들 } from './authoring-status.js';
import { 친다 } from './authoring-io.js';

/** 한 번 부를 때 돌릴 시간 — Bash 도구 상한이 10분이고 백그라운드는 금지라 한 번에 다 못 돈다. Playwright 띄우는 몫을 남긴다 */
export const 차례예산 = 7.5 * 60_000;
/** 앞 기록이 없을 때 한 회차 어림 — 응답 늦추기로 MKT 417건 × 3번을 65분에 돌았다(#303 · 회차당 약 3초) */
export const 기본회차 = 4_000;

type 모드 = '보조' | '마지막';
type 기기판들 = (파일: string, 기기: string) => readonly 돌린판[] | undefined;

/**
 * 파일마다 이번에 몇 번 돌릴지. 고친 뒤(수정 시각 뒤) 기록만 본다.
 * - 보조: 응답 늦추기로 3번 돌린 기록이 없으면 3번 — 빨강이어도 3번 돌렸으면 끝이다(고치면 수정 시각이 바뀌어 다시 고른다)
 * - 마지막: 3번 다 초록인 기록(보조 것이든)이 있으면 마지막 1번만, 없으면 마지막 3번. 마지막 기록이 이미 있으면 빨강이어도 끝이다 —
 *   기획서와 화면이 달라 늘 빨간 케이스를 끝없이 다시 돌리지 않게
 */
export function 할일고르기(대상: Record<string, number>, 판들: 기기판들, 기기들: readonly string[], 모드: 모드): { 셋: string[]; 하나: string[] } {
  const 셋: string[] = [];
  const 하나: string[] = [];
  for (const [파일, 수정] of Object.entries(대상)) {
    const 상태들 = 기기들.map((기기) => ({ 상태: 파일상태보기(판들(파일, 기기), 수정), 판: 판들(파일, 기기) ?? [] }));
    const 세번돌림 = (끝만: boolean) =>
      상태들.every(({ 판 }) => 판.some((p) => p.시작 >= 수정 && p.느림 && p.상태들.length >= 3 && (!끝만 || p.끝)));
    if (모드 === '보조') {
      if (!세번돌림(false)) 셋.push(파일);
    } else if (상태들.every(({ 상태 }) => 상태.셋)) {
      if (!상태들.every(({ 상태 }) => 상태.끝판 !== null)) 하나.push(파일);
    } else if (!세번돌림(true)) 셋.push(파일);
  }
  return { 셋: 셋.sort(), 하나: 하나.sort() };
}

/** 앞에서부터 예산 안에 드는 만큼. 하나도 안 들면 첫 파일 하나는 돌린다 */
export function 차례나누기(파일들: readonly string[], 회수: number, 어림: (파일: string) => number, 예산: number): string[] {
  const 고른: string[] = [];
  let 합 = 0;
  for (const 파일 of 파일들) {
    const 걸림 = 어림(파일) * 회수;
    if (고른.length > 0 && 합 + 걸림 > 예산) break;
    고른.push(파일);
    합 += 걸림;
  }
  return 고른;
}

/** 앞 기록의 PC 회차 평균. 없으면 기본값 */
export function 회차어림(판들: readonly 돌린판[] | undefined): number {
  const 시간들 = (판들 ?? []).flatMap((p) => p.시간들);
  return 시간들.length === 0 ? 기본회차 : 시간들.reduce((a, b) => a + b, 0) / 시간들.length;
}

/** 같은 머리 기록 가운데 다음 번호 — 휴대폰 기록(`-mobile`)은 PC 와 번호를 같이 쓴다 */
export function 다음번호(이름들: readonly string[], 머리: string): number {
  const 꼴 = new RegExp(`^${머리}-(\\d+)(-mobile)?\\.json$`);
  return Math.max(0, ...이름들.map((n) => Number(꼴.exec(n)?.[1] ?? 0))) + 1;
}

/** 빨간 파일마다 한 줄 — 기기 · 빨간 회차 수 · 첫 오류 줄. 고친 뒤 기록이 있으면 그 가운데 가장 늦은 것으로 본다 */
export function 빨강줄들(대상: Record<string, number>, 판들: 기기판들, 기기들: readonly string[]): string[] {
  const 말 = { desktop: 'PC', mobile: '휴대폰' } as Record<string, string>;
  return Object.entries(대상).flatMap(([파일, 수정]) =>
    기기들.flatMap((기기) => {
      const 새것 = (판들(파일, 기기) ?? []).filter((p) => p.시작 >= 수정);
      if (새것.length === 0) return [];
      const 늦은 = 새것.reduce((a, b) => (b.시작 > a.시작 ? b : a));
      const 빨강 = 늦은.상태들.filter((s) => s === 'unexpected').length;
      return 빨강 === 0 ? [] : [`- ${파일} (${말[기기] ?? 기기} ${빨강}/${늦은.상태들.length}): ${늦은.오류 ?? '오류 글 없음'}`];
    }),
  );
}

function 돌리기(트리: string, 결과폴더: string, 이름: string, 파일들: readonly string[], 회수: number, 기기: string): Promise<number> {
  const 로그 = openSync(join(결과폴더, `${이름}.log`), 'w');
  const 자식 = spawn('npx', ['playwright', 'test', ...파일들.map((f) => `tests/${f}`), `--project=${기기}`, '--workers=1', `--repeat-each=${회수}`, '--reporter=line,json'], {
    cwd: 트리,
    // 산출물 폴더를 기록마다 가른다 — Playwright 는 시작할 때 출력 폴더를 비워 나란히 도는 PC · 휴대폰이 서로 지운다
    env: { ...process.env, PLATFORM_SLOW_API: '1', PLAYWRIGHT_JSON_OUTPUT_FILE: join(결과폴더, `${이름}.json`), PLATFORM_OUTPUT_ID: 이름 },
    stdio: ['ignore', 로그, 로그],
  });
  return new Promise((풀림) => {
    자식.on('close', (코드) => {
      closeSync(로그);
      풀림(코드 ?? 1);
    });
  });
}

export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const 휴대폰 = 인자.includes('--mobile');
  const [모드, 이름, ...나머지] = 인자.filter((a) => a !== '--mobile');
  const 결과폴더 = env.AUTHORING_GATE3_DIR;
  if ((모드 !== '보조' && 모드 !== '마지막') || 이름 === undefined || !/^[a-z0-9-]+$/.test(이름)) {
    console.error('쓰는 법: npm run authoring:run -- 보조 <묶음(영문 소문자 · 숫자 · -)> <케이스 파일…> [--mobile] | 마지막 <폴더> [--mobile]');
    return 2;
  }
  if (결과폴더 === undefined || 결과폴더 === '') {
    console.error('AUTHORING_GATE3_DIR 가 없다 — 작성 에이전트가 주는 기록 자리다');
    return 2;
  }
  const 기기들 = 휴대폰 ? ['desktop', 'mobile'] : ['desktop'];
  const 맡은 = 나머지.map((f) => f.replace(/^tests\//, ''));
  const 폴더 = 모드 === '마지막' ? 이름 : (맡은[0]?.split('/')[0] ?? '');
  let 바뀐: Set<string>;
  if (모드 === '마지막') {
    const 상태 = 친다('git', ['-c', 'core.quotePath=false', 'status', '--porcelain', '-uall'], 트리);
    if (!상태.ok) {
      console.error(`바뀐 파일을 못 읽었다: ${상태.까닭}`);
      return 2;
    }
    바뀐 = new Set(바뀐파일들(상태.낸것).filter((p) => p.startsWith('tests/')).map((p) => p.slice('tests/'.length)));
  } else 바뀐 = new Set(맡은);
  // 맡은 파일 · 이번에 바뀐 파일에 닿는 케이스와, 그 케이스 · 부품 가운데 가장 늦은 수정 시각
  const 대상 = Object.fromEntries(Object.entries(살필케이스(케이스파일읽기(트리, 폴더), 바뀐)).filter(([f]) => 모드 === '마지막' || 바뀐.has(f)));
  if (Object.keys(대상).length === 0) {
    console.log('[돌려 보기] 돌릴 케이스가 없다');
    return 0;
  }

  // 깨진 기록은 빼고 본다 — 그 파일은 다시 돌린다. 에이전트 판정은 깨진 기록을 따로 경고한다
  const 읽기 = () => {
    const 기록 = 돌린기록들(결과폴더).filter((r) => {
      try {
        JSON.parse(r.글);
        return true;
      } catch {
        return false;
      }
    });
    const 판들 = 판들읽기(기록)?.판들 ?? new Map<string, 돌린판[]>();
    return (파일: string, 기기: string) => 판들.get(`${파일}\0${기기}`);
  };
  const 앞판들 = 읽기();
  const 할일 = 할일고르기(대상, 앞판들, 기기들, 모드);
  const 어림 = (파일: string) => 회차어림(앞판들(파일, 'desktop'));
  const 셋차례 = 차례나누기(할일.셋, 3, 어림, 차례예산);
  const 남은예산 = 차례예산 - 셋차례.reduce((합, f) => 합 + 어림(f) * 3, 0);
  const 하나차례 = 셋차례.length === 할일.셋.length && 남은예산 > 0 ? 차례나누기(할일.하나, 1, 어림, 남은예산) : [];
  const 머리 = 모드 === '마지막' ? 'gate3-final' : `gate3-part-${이름}`;
  const 시작 = Date.now();
  for (const [파일들, 회수] of [[셋차례, 3], [하나차례, 1]] as const) {
    if (파일들.length === 0) continue;
    const 번호 = 다음번호(readdirSync(결과폴더), 머리);
    // PC · 휴대폰을 나란히 — 차례로 돌면 두 배 걸린다
    await Promise.all(기기들.map((기기) => 돌리기(트리, 결과폴더, `${머리}-${번호}${기기 === 'mobile' ? '-mobile' : ''}`, 파일들, 회수, 기기)));
  }

  const 뒤판들 = 읽기();
  const 남은 = 할일고르기(대상, 뒤판들, 기기들, 모드);
  const 이번 = Object.fromEntries([...셋차례, ...하나차례].map((f) => [f, 대상[f]!]));
  const 남은수 = 남은.셋.length + 남은.하나.length;
  const 빨강 = 빨강줄들(남은수 === 0 ? 대상 : 이번, 뒤판들, 기기들);
  console.log(
    `[돌려 보기] ${모드} · 케이스 ${Object.keys(대상).length}건 가운데 이번 3번 ${셋차례.length}건 · 1번 ${하나차례.length}건${휴대폰 ? ' (PC · 휴대폰)' : ' (PC)'} · ${Math.round((Date.now() - 시작) / 1000)}초 · 기록 ${결과폴더}`,
  );
  if (빨강.length > 0) console.log([`빨강 ${빨강.length}줄${남은수 === 0 ? ' (전체)' : ' (이번 차례)'}`, ...빨강].join('\n'));
  if (남은수 > 0) {
    console.log(`남은 것 ${남은수}건 — 같은 명령을 다시 부른다`);
    return 3;
  }
  console.log('다 돌았다');
  return 빨강.length > 0 ? 1 : 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await 실행(process.argv.slice(2)).catch((e: unknown) => {
    console.error(`[돌려 보기] 실패 — ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  });
}
