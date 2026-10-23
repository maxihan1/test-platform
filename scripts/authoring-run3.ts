// 돌려 보기 명령 — 다시 돌릴 케이스를 고르고, 10분 안쪽으로 나눠 차례로 돌린 뒤 빨간 것만 요약한다 (SPEC 도메인/작성 §3.6 「돌려 보기 명령」)
// 자식이 grep 으로 케이스를 모으고 덩어리를 손으로 나누고 기록 번호를 붙이던 일이다. #303 마지막 돌려 보기는 명령 11번 · 기록 읽기 11번이었다
// 실행: npm run authoring:run -- 보조 <묶음> <케이스 파일…> [--mobile]  |  마지막 <폴더> [--mobile]  |  한번 <묶음> <케이스 파일…> [--mobile-only] [--trace] (기기 하나 — 기본 PC)
// Playwright 를 띄우기 전에 컨테이너 전체가 같이 세는 브라우저 자리를 받는다(authoring-slot) — 기다린 시간도 한 번 부를 때의 예산 안이다

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, openSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { type 돌린판, 돌린기록들, 앱케이스나누기, 케이스파일읽기, 살필케이스, 파일상태보기, 판들읽기 } from './authoring-gate3.js';
import { 바뀐것 } from './authoring-base-list.js';
import { 자리기다리기, 자리놓기 } from './authoring-slot.js';

/** 한 번 부를 때 돌릴 시간 — Bash 도구 상한이 10분이고 백그라운드는 금지라 한 번에 다 못 돈다. Playwright 띄우고 닫는 몫을 남긴다 */
export const 차례예산 = 7.5 * 60_000;
/** 앞 기록이 하나도 없을 때 한 회차 어림 — 응답 늦추기로 MKT 417건 × 3번을 65분에 돌았다(#303 · 회차당 약 3초) */
export const 기본회차 = 4_000;
/** 남은 예산이 이보다 적으면 다음 덩어리를 띄우지 않는다 */
const 띄울최소 = 30_000;
/** 브라우저 자리를 받은 뒤 남길 예산 — 덜 남으면 기다리지 말고 「남은 것」으로 끝낸다 */
const 기다림여유 = 2 * 60_000;

type 모드 = '보조' | '마지막' | '한번';
type 판찾기 = (파일: string) => readonly 돌린판[] | undefined;

/**
 * 한 기기에서 파일마다 이번에 몇 번 돌릴지. 고친 뒤(수정 시각 뒤) 기록만 본다 — 판정은 에이전트와 같은 `파일상태보기`.
 * - 보조: 응답 늦추기로 3번 돌린 기록이 없으면 3번. 빨강이어도 3번 돌렸으면 끝이다(고치면 수정 시각이 바뀌어 다시 고른다)
 * - 마지막: 3번 다 초록인 기록(보조 것이든)이 있으면 마지막 1번만, 없으면 마지막 3번. 마지막 기록이 있으면(3번 다 초록이 없을 때는 마지막 3번이) 빨강이어도 끝이다 —
 *   기획서와 화면이 달라 늘 빨간 케이스를 끝없이 다시 돌리지 않게
 */
export function 할일고르기(대상: Record<string, number>, 판들: 판찾기, 모드: 모드): { 셋: string[]; 하나: string[] } {
  const 셋: string[] = [];
  const 하나: string[] = [];
  for (const [파일, 수정] of Object.entries(대상)) {
    const 상태 = 파일상태보기(판들(파일), 수정);
    if (모드 === '보조') {
      if (!상태.세번돌림) 셋.push(파일);
    } else if (상태.셋) {
      if (상태.끝판 === null) 하나.push(파일);
    } else if (!상태.끝세번돌림) 셋.push(파일);
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

/** 그 파일 앞 기록의 회차 평균, 없으면 모든 기록의 평균, 그것도 없으면 기본값 — 처음 차례가 어림보다 길어 잘려도 다음 차례는 배운 값으로 줄인다 */
export function 회차어림(그파일: readonly 돌린판[] | undefined, 전체: readonly 돌린판[]): number {
  const 평균 = (판들: readonly 돌린판[]) => {
    const 시간들 = 판들.flatMap((p) => p.시간들);
    return 시간들.length === 0 ? null : 시간들.reduce((a, b) => a + b, 0) / 시간들.length;
  };
  return 평균(그파일 ?? []) ?? 평균(전체) ?? 기본회차;
}

/** 같은 머리 기록 가운데 다음 번호 — 휴대폰 기록(`-mobile`)은 PC 와 번호를 같이 쓴다 */
export function 다음번호(이름들: readonly string[], 머리: string): number {
  const 꼴 = new RegExp(`^${머리}-(\\d+)(-mobile)?\\.json$`);
  return Math.max(0, ...이름들.map((n) => Number(꼴.exec(n)?.[1] ?? 0))) + 1;
}

/** 빨간 파일마다 한 줄 — 기기 · 빨간 회차 수 · 첫 오류 줄. 고친 뒤 기록 가운데 가장 늦은 것으로 본다 */
export function 빨강줄들(대상: Record<string, number>, 판들: (파일: string, 기기: string) => readonly 돌린판[] | undefined, 기기들: readonly string[]): string[] {
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

/** 맡은 파일 인자를 testDir 기준 경로로 — `tests/…` · `./tests/…` · 절대 경로를 다 받고, tests 밖이면 null */
export function 케이스경로(트리: string, 인자: string): string | null {
  const 상대 = relative(join(트리, 'tests'), resolve(트리, 인자));
  return 상대 === '' || 상대.startsWith('..') ? null : 상대.split('\\').join('/');
}

function 돌리기(트리: string, 결과폴더: string, 이름: string, 파일들: readonly string[], 회수: number, 기기: string, 상한: number, 덧 = { 느림: true, 추적: false }): Promise<number> {
  const 로그 = openSync(join(결과폴더, `${이름}.log`), 'w');
  // 전체 시간 상한 — 어림보다 길어져도 Bash 10분 상한 전에 Playwright 가 스스로 멈추고 끝낸 회차까지 기록을 쓴다(2026-10-19 실측)
  const 인자 = ['playwright', 'test', ...파일들.map((f) => `tests/${f}`), `--project=${기기}`, '--workers=1', `--repeat-each=${회수}`, `--global-timeout=${Math.round(상한)}`, '--reporter=line,json', ...(덧.추적 ? ['--trace=on'] : [])];
  const 자식 = spawn('npx', 인자, {
    cwd: 트리,
    // 산출물 폴더를 기록마다 가른다 — Playwright 는 시작할 때 출력 폴더를 비워 나란히 도는 PC · 휴대폰이 서로 지운다
    // 1번 돌려 보기는 응답을 안 늦춘다 — 부른 쪽이 앞에 붙인 PLATFORM_SLOW_API · PLATFORM_PARAMS 는 그대로 간다
    env: { ...process.env, ...(덧.느림 ? { PLATFORM_SLOW_API: '1' } : {}), PLAYWRIGHT_JSON_OUTPUT_FILE: join(결과폴더, `${이름}.json`), PLATFORM_OUTPUT_ID: 이름 },
    stdio: ['ignore', 로그, 로그],
  });
  return new Promise((풀림) => {
    자식.on('close', (코드) => {
      closeSync(로그);
      풀림(코드 ?? 1);
    });
  });
}

/** 같은 머리의 다음 기록 이름 — 휴대폰은 `-mobile` 을 붙인다 */
const 기록이름 = (결과폴더: string, 머리: string, 기기: string) => `${머리}-${다음번호(readdirSync(결과폴더), 머리)}${기기 === 'mobile' ? '-mobile' : ''}`;

/**
 * 줄 열쇠 — 같으면 「남은 것」으로 돌아온 뒤 다시 부를 때 앞 차례를 잇는다(PRD-F14-08). 모드 · 묶음 · 기기마다 하나이고(같은 명령을 다시 부를 때만 잇는다),
 * 동시에 도는 다른 작성 요청의 같은 묶음 이름과 섞이지 않게 작업 트리 지문을 앞에 붙인다
 */
export const 줄열쇠 = (트리: string, 이름: string, 기기: string): string => `${createHash('sha1').update(resolve(트리)).digest('hex').slice(0, 8)}-${이름}-${기기}`;

/**
 * 브라우저 자리를 받아 `일` 을 돌리고 놓는다. 기다린 시간(ms)을, 자리가 안 났으면 null.
 * 받은 뒤 적어도 `기다림여유` 는 남게 마감을 당긴다 — 막 받고 30초만 남으면 아무 회차도 못 끝내 「케이스 문법 오류」(2)로 읽힌다(code-review)
 */
async function 자리받아(시작: number, 열쇠: string, 일: () => Promise<void>): Promise<number | null> {
  const 자리 = await 자리기다리기(시작 + 차례예산 - 기다림여유, undefined, undefined, undefined, 열쇠);
  if (자리 === null) return null;
  const 기다림 = Date.now() - 시작;
  try {
    await 일();
  } finally {
    자리놓기(자리);
  }
  return 기다림;
}

/**
 * 맡은 파일을 1번 — 보조가 쓰는 도중 · 입력값 두 번 · trace 로 까닭 가르기에 쓴다. 응답은 안 늦추고 부른 쪽이 붙인 환경 변수는 그대로 간다.
 * 기록은 `once-<묶음>-<번호>` 라 3회 판정에 안 섞인다.
 * 14644 보조는 이 명령이 없어 Playwright 를 손으로 120번 돌렸고 97번은 산출물 폴더를 안 갈라 넷이 서로 지울 수 있었다(PRD-F14-02)
 */
async function 한번(트리: string, 결과폴더: string, 이름: string, 파일들: string[], 기기들: readonly string[], 추적: boolean, 산출물: string): Promise<number> {
  const 시작 = Date.now();
  const 머리 = `once-${이름}`;
  const 돈: { 기기: string; 이름: string }[] = [];
  const 기다림들 = await Promise.all(
    기기들.map((기기) =>
      자리받아(시작, 줄열쇠(트리, `한번-${이름}`, 기기), async () => {
        const 기록 = 기록이름(결과폴더, 머리, 기기);
        돈.push({ 기기, 이름: 기록 });
        await 돌리기(트리, 결과폴더, 기록, 파일들, 1, 기기, 차례예산 - (Date.now() - 시작), { 느림: false, 추적 });
      }),
    ),
  );
  const 이름들 = new Set(돈.map((d) => `${d.이름}.json`));
  const 판들 = 판들읽기(돌린기록들(결과폴더, /^once-/).filter((r) => 이름들.has(r.이름)), true)?.판들 ?? new Map<string, 돌린판[]>();
  const 찾기 = (f: string, 기기: string) => 판들.get(`${f}\0${기기}`);
  // 끝까지 못 돈 것(Playwright 가 죽었거나 시간 상한에 잘렸다)을 초록으로 세지 않는다
  const 못돈 = 돈.flatMap((d) => 파일들.filter((f) => 찾기(f, d.기기) === undefined).map((f) => `- ${f} (${d.기기 === 'mobile' ? '휴대폰' : 'PC'}): 끝까지 못 돌았다`));
  const 빨강 = [...빨강줄들(Object.fromEntries(파일들.map((f) => [f, 0])), 찾기, 기기들), ...못돈];
  const 기록 = 돈.map((d) => join(결과폴더, `${d.이름}.log`)).join(' · ');
  if (돈.length > 0) {
    if (판들.size === 0) {
      console.log(`[1번 돌려 보기] 돌렸지만 끝난 케이스가 없다 — 로그를 본다: ${기록}`);
      return 2;
    }
    const trace = 추적 ? ` · trace ${돈.map((d) => join(산출물, 'playwright', d.이름)).join(' · ')}` : '';
    console.log(`[1번 돌려 보기] 케이스 ${파일들.length}건 · ${Math.round((Date.now() - 시작) / 1000)}초 · 로그 ${기록}${trace}`);
    if (빨강.length > 0) console.log([`빨강 ${빨강.length}줄`, ...빨강].join('\n'));
  }
  if (기다림들.includes(null)) {
    console.log('브라우저 자리가 안 나 못 돌린 기기가 있다 — 같은 명령을 다시 부른다');
    return 3;
  }
  return 빨강.length > 0 ? 1 : 0;
}

/**
 * 돌릴 기기 — `--mobile` 이면 휴대폰도 나란히. 단 쓰는 중 1번은 기기 하나만 돈다(기본 PC · `--mobile-only` 면 휴대폰):
 * 보조 하나가 PC · 휴대폰으로 자리 둘을 원해 넷이 자리 둘을 두고 줄 섰다(14670 · PRD-F14-09). 휴대폰만 빨간 케이스를 trace 로 가를 길은 남긴다
 */
export const 돌릴기기 = (모드: string, 휴대폰: boolean, 휴대폰만 = false): string[] =>
  모드 === '한번' ? [휴대폰만 ? 'mobile' : 'desktop'] : 휴대폰 ? ['desktop', 'mobile'] : ['desktop'];

export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const 휴대폰 = 인자.includes('--mobile');
  const 휴대폰만 = 인자.includes('--mobile-only');
  const 추적 = 인자.includes('--trace');
  const [모드, 이름, ...나머지] = 인자.filter((a) => a !== '--mobile' && a !== '--mobile-only' && a !== '--trace');
  const 결과폴더 = env.AUTHORING_GATE3_DIR;
  // 묶음 slug 는 기록 이름에 들어가 좁게, 폴더는 명세의 테스트 폴더 규칙(도메인/작성 §3.6 「테스트 폴더」)대로
  const 이름꼴 = 모드 === '마지막' ? /^[A-Za-z0-9._-]+$/ : /^[a-z0-9-]+$/;
  if ((모드 !== '보조' && 모드 !== '마지막' && 모드 !== '한번') || 이름 === undefined || !이름꼴.test(이름) || (모드 !== '마지막' && 나머지.length === 0) || ((추적 || 휴대폰만) && 모드 !== '한번')) {
    console.error('쓰는 법: npm run authoring:run -- 보조 <묶음(영문 소문자 · 숫자 · -)> <케이스 파일…> [--mobile] | 마지막 <테스트 폴더> [--mobile] | 한번 <묶음> <케이스 파일…> [--mobile-only] [--trace] (1번은 기기 하나 — 기본 PC)');
    return 2;
  }
  if (결과폴더 === undefined || 결과폴더 === '') {
    console.error('AUTHORING_GATE3_DIR 가 없다 — 작성 에이전트가 주는 기록 자리다');
    return 2;
  }
  const 기기들 = 돌릴기기(모드, 휴대폰, 휴대폰만);
  const 맡은 = 나머지.map((f) => 케이스경로(트리, f));
  const 폴더 = 모드 === '마지막' ? 이름 : (맡은[0]?.split('/')[0] ?? '');
  const 케이스들 = 케이스파일읽기(트리, 폴더);
  const 모름 = 나머지.filter((_, i) => 맡은[i] === null || !케이스들.some((f) => f.경로 === 맡은[i]));
  if (모름.length > 0) {
    console.error(`모르는 케이스 파일(tests/${폴더} 아래가 아니거나 없다): ${모름.join(' · ')}`);
    return 2;
  }
  let 바뀐: Set<string>;
  if (모드 === '마지막') {
    const 목록 = 바뀐것(트리, env.AUTHORING_BASE_LIST);
    if ('까닭' in 목록) {
      console.error(`바뀐 파일을 못 읽었다: ${목록.까닭}`);
      return 2;
    }
    바뀐 = new Set(목록.filter((p) => p.startsWith('tests/')).map((p) => p.slice('tests/'.length)));
  } else 바뀐 = new Set(맡은 as string[]);
  // 맡은 파일 · 이번에 바뀐 파일에 닿는 케이스와, 그 케이스 · 부품 가운데 가장 늦은 수정 시각
  // 앱 케이스는 PC 프로젝트에서 건너뛰기만 해 3번 다 초록으로 찍힌다 — 고르지 않고 안 돌린다고 알린다 (작성 §3.6 「앱 화면」)
  const { 앱, 나머지: 웹케이스 } = 앱케이스나누기(케이스들, 살필케이스(케이스들, 바뀐));
  if (앱.length > 0) console.log(`[돌려 보기] 앱 케이스 ${앱.length}건은 폰이 없어 안 돌린다 — ${앱.join(' · ')}`);
  const 대상 = Object.fromEntries(Object.entries(웹케이스).filter(([f]) => 모드 === '마지막' || 바뀐.has(f)));
  if (Object.keys(대상).length === 0) {
    console.log('[돌려 보기] 돌릴 케이스가 없다');
    return 0;
  }
  // 대상 서버를 하나로 저절로 고르지 않는다 — 정방향 · 반영의 서버 목록에 운영 서버가 섞일 수 있다. 빠뜨리면 회차마다 `Invalid URL` 로 빨개진다(14644 — 314회차 · PR #390 검토).
  // 돌릴 것이 없는 부름(묶음 숫자만 다시 찍기)은 막지 않는다
  const 주소없음 = () => {
    if (!env.PLATFORM_BASE_URL) console.error('PLATFORM_BASE_URL 이 없다 — 프롬프트의 대상 서버 목록에서 운영 아닌 주소를 골라 `PLATFORM_BASE_URL=<주소> npm run -s authoring:run -- …` 로 다시 부른다');
    return !env.PLATFORM_BASE_URL;
  };
  if (모드 === '한번') {
    if (주소없음()) return 2;
    if (휴대폰 && !휴대폰만) console.log('[1번 돌려 보기] 휴대폰은 안 돈다 — 1번은 기기 하나만 돈다. 휴대폰만 보려면 --mobile-only, 둘 다는 보조 3회와 마지막 전체 돌려 보기에서 돈다');
    return 한번(트리, 결과폴더, 이름, Object.keys(대상).sort(), 기기들, 추적, env.PLATFORM_ARTIFACTS_DIR ?? 'artifacts');
  }

  const 읽기 = () => {
    const 판들 = 판들읽기(돌린기록들(결과폴더), true)?.판들 ?? new Map<string, 돌린판[]>();
    return { 찾기: (파일: string, 기기: string) => 판들.get(`${파일}\0${기기}`), 전체: [...판들.values()].flat() };
  };
  const 앞 = 읽기();
  const 할일들 = new Map(기기들.map((기기) => [기기, 할일고르기(대상, (파일) => 앞.찾기(파일, 기기), 모드)]));
  if ([...할일들.values()].some((h) => h.셋.length + h.하나.length > 0) && 주소없음()) return 2;
  const 머리 = 모드 === '마지막' ? 'gate3-final' : `gate3-part-${이름}`;
  const 시작 = Date.now();
  // 기기마다 따로 고르고 나란히 돈다 — PC 는 보조 3번이 다 초록이고 휴대폰만 빨강이면 PC 는 1번 · 휴대폰은 3번
  const 차례들 = await Promise.all(
    기기들.map(async (기기) => {
      const 할일 = 할일들.get(기기)!;
      const 어림 = (파일: string) => 회차어림(앞.찾기(파일, 기기), 앞.전체);
      const 고른 = { 기기, 셋: [] as string[], 하나: [] as string[], 로그: [] as string[], 기다림: 0, 자리없음: false };
      if (할일.셋.length + 할일.하나.length === 0) return 고른;
      const 기다림 = await 자리받아(시작, 줄열쇠(트리, `${모드}-${이름}`, 기기), async () => {
        // 덩어리는 자리를 받은 뒤 남은 예산으로 자른다 — 기다린 만큼 덜 돈다. 실제로 띄운 것만 고른 것에 담는다(못 띄운 것을 「돌렸는데 끝난 것 없음」으로 세지 않게)
        const 셋차례 = 차례나누기(할일.셋, 3, 어림, 차례예산 - (Date.now() - 시작));
        for (const [파일들, 회수] of [[셋차례, 3], [할일.하나, 1]] as const) {
          const 남은예산 = 차례예산 - (Date.now() - 시작);
          if (파일들.length === 0 || 남은예산 < 띄울최소 || (회수 === 1 && 셋차례.length < 할일.셋.length)) continue;
          const 이번 = 회수 === 3 ? 파일들 : 차례나누기(파일들, 1, 어림, 남은예산);
          (회수 === 3 ? 고른.셋 : 고른.하나).push(...이번);
          const 기록 = 기록이름(결과폴더, 머리, 기기);
          고른.로그.push(join(결과폴더, `${기록}.log`));
          await 돌리기(트리, 결과폴더, 기록, 이번, 회수, 기기, 남은예산);
        }
      });
      return 기다림 === null ? { ...고른, 자리없음: true } : { ...고른, 기다림 };
    }),
  );

  const 뒤 = 읽기();
  const 남은들 = 기기들.map((기기) => 할일고르기(대상, (파일) => 뒤.찾기(파일, 기기), 모드));
  const 남은수 = new Set(남은들.flatMap((n) => [...n.셋, ...n.하나])).size;
  const 이번파일 = new Set(차례들.flatMap((c) => [...c.셋, ...c.하나]));
  // 끝까지 돈 회차가 하나라도 늘었나 — 시간 상한에 잘려 3번을 못 채웠어도 회차가 늘었으면 다음 차례가 배운 시간으로 줄여 이어 간다
  const 회차수 = (판들: readonly 돌린판[]) => 판들.reduce((합, p) => 합 + p.상태들.length, 0);
  const 진척 = 회차수(뒤.전체) > 회차수(앞.전체);
  const 말 = (c: (typeof 차례들)[number]) =>
    `${c.기기 === 'mobile' ? '휴대폰' : 'PC'} ${c.자리없음 ? '브라우저 자리가 안 나 못 돎' : `3번 ${c.셋.length}건 · 1번 ${c.하나.length}건`}${c.기다림 >= 1_000 ? ` (자리 기다림 ${Math.round(c.기다림 / 1000)}초)` : ''}`;
  console.log(`[돌려 보기] ${모드} · 케이스 ${Object.keys(대상).length}건 가운데 이번 ${차례들.map(말).join(' · ')} · ${Math.round((Date.now() - 시작) / 1000)}초 · 기록 ${결과폴더}`);
  // 돌렸는데 한 건도 끝나지 않았으면 같은 명령을 다시 불러도 같다 — 케이스 문법 오류 · 브라우저 없음 같은 것이다
  if (이번파일.size > 0 && !진척) {
    console.log(`돌렸지만 끝난 케이스가 없다 — 로그를 본다: ${차례들.flatMap((c) => c.로그).join(' · ')}`);
    return 2;
  }
  const 빨강 = 빨강줄들(남은수 === 0 ? 대상 : Object.fromEntries([...이번파일].map((f) => [f, 대상[f]!])), 뒤.찾기, 기기들);
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
