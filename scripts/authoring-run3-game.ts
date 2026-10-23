// 돌려 보기 명령의 게임 갈래 — AI 가 잡은 디바이스 팜 폰에서 이번에 바뀐 게임 케이스를 1번씩 돌린다 (SPEC 도메인/게임 §3.10 「작성 — 한 바퀴」 6 · 도메인/작성 §3.6 「앱 화면」)
// 웹은 3번 · 느린 망이지만 게임은 폰이 한 대라 케이스마다 1번이다(결정 4). 앱 케이스는 폰이 없어 안 돌리는데, 게임 작성에는 폰을 잡은 AI 가 있다.
// 돌려 보기 명령(authoring-run3)이 `게임` 모드를 여기로 넘긴다 — 여기서 그 파일을 import 하지 않는다(그쪽 맨 위 await 와 엮이면 서로 기다린다)

import { spawn } from 'node:child_process';
import { closeSync, lstatSync, openSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type 돌린판, 돌린기록들, 앱케이스나누기, 케이스파일읽기, 살필케이스, 판들읽기 } from './authoring-gate3.js';
import { 바뀐것 } from './authoring-base-list.js';
import { 게임자료환경 } from './authoring-check-game.js';

/** 게임 돌려 보기 기록 — 웹 3번 판정(`gate3-final` · `gate3-part-`)에 안 섞인다 */
export const 게임기록꼴 = /^gate3-game-.*\.json$/;
/** 한 번 부를 때 돌릴 시간 — 웹 돌려 보기와 같다(Bash 10분 상한) */
const 예산 = 7.5 * 60_000;
/** 앞 기록이 없을 때 한 케이스 어림 — 앱을 다시 켜고 게임이 답하고 상태를 만드는 몫 */
export const 게임회차 = 60_000;
const 폰번호꼴 = /^[A-Za-z0-9._:-]{1,64}$/;

/** 이번에 돌릴 게임 케이스 — 고친 뒤(수정 시각 뒤) android 로 돈 기록이 없는 것. 빨강이어도 돌았으면 끝이다(고치면 수정 시각이 바뀌어 다시 고른다) */
export function 게임할일(대상: Record<string, number>, 판들: (파일: string) => readonly 돌린판[] | undefined): string[] {
  return Object.entries(대상)
    .filter(([파일, 수정]) => !(판들(파일) ?? []).some((p) => Number.isFinite(p.시작) && p.시작 >= 수정))
    .map(([파일]) => 파일)
    .sort();
}

/**
 * AI 가 `npx control-cli hold` 로 잡은 폰 번호 — 작업 폴더 `.control-cli/held`. 없거나 꼴이 아니면 null.
 * 자식이 쓴 파일이지만 이 명령도 자식이 돌린다 — 링크만 따라가지 않는다(에이전트의 잡은폰놓기와 같은 검사)
 */
export function 잡은폰(트리: string): string | null {
  const 기록 = join(트리, '.control-cli', 'held');
  const 정보 = lstatSync(기록, { throwIfNoEntry: false });
  if (정보 === undefined || !정보.isFile() || 정보.size > 100) return null;
  const 번호 = readFileSync(기록, 'utf8').trim();
  return 폰번호꼴.test(번호) ? 번호 : null;
}

/** kit 이 팜 폰의 게임에 붙는 환경값 — 정식 실행의 러너(execute.ts gameEnv)와 같다. 어드민 키 · 대상 서버는 에이전트가 넘긴 것이 그대로 간다 */
export const 게임환경 = (폰: string): Record<string, string> => ({ PLATFORM_ENGINE: 'GAME', PLATFORM_GAME_LINK: 'farm', PLATFORM_DEVICE_UDID: 폰 });

/** 이번 작성이 닿은 게임 케이스(android 선언)와 그 케이스 · 부품 가운데 가장 늦은 수정 시각 — 웹 돌려 보기 · 끝 검사와 같은 함수로 고른다 */
export function 게임대상(트리: string, 폴더: string, 바뀐: readonly string[]): Record<string, number> {
  const 케이스들 = 케이스파일읽기(트리, 폴더);
  const 볼것 = 살필케이스(케이스들, new Set(바뀐.filter((p) => p.startsWith('tests/')).map((p) => p.slice('tests/'.length))));
  return Object.fromEntries(앱케이스나누기(케이스들, 볼것).앱.map((f) => [f, 볼것[f]!]));
}

/** 게임 기록을 파일마다 — 깨진 기록은 빼고 본다(그 파일을 다시 돌리면 된다) */
export function 게임판들(결과폴더: string): Map<string, 돌린판[]> {
  const 판들 = 판들읽기(돌린기록들(결과폴더, 게임기록꼴), true)?.판들 ?? new Map<string, 돌린판[]>();
  return new Map([...판들].filter(([열쇠]) => 열쇠.endsWith('\0android')).map(([열쇠, 판]) => [열쇠.slice(0, -'\0android'.length), 판]));
}

/** 고친 뒤 가장 늦게 돈 기록이 빨간 파일과 그 첫 오류 줄 */
export function 빨간게임(대상: Record<string, number>, 판들: (파일: string) => readonly 돌린판[] | undefined): { 파일: string; 오류: string }[] {
  return Object.entries(대상).flatMap(([파일, 수정]) => {
    const 새것 = (판들(파일) ?? []).filter((p) => p.시작 >= 수정);
    if (새것.length === 0) return [];
    const 늦은 = 새것.reduce((a, b) => (b.시작 > a.시작 ? b : a));
    return 늦은.상태들.includes('unexpected') ? [{ 파일, 오류: 늦은.오류 ?? '오류 글 없음' }] : [];
  });
}

/**
 * 에이전트 끝 검사의 게임 줄 — 이번 작성이 닿은 게임 케이스 가운데 고친 뒤 폰에서 안 돈 것 · 빨간 것. 앱 경고처럼 막지 않는다(작성 요약 머리에 싣는다).
 * 자식이 끝난 뒤 root 가 읽는다. 예외는 줄 하나로 — 이 검사로 올리기가 죽으면 안 된다
 */
export function 게임끝검사(결과폴더: string, 트리: string, 폴더: string, 바뀐: readonly string[]): string[] {
  try {
    const 대상 = 게임대상(트리, 폴더, 바뀐);
    const 판들 = 게임판들(결과폴더);
    const 안돈 = 게임할일(대상, (f) => 판들.get(f));
    const 빨강 = 빨간게임(대상, (f) => 판들.get(f)).map((r) => r.파일);
    return [
      ...(안돈.length === 0 ? [] : [`⚠️ 폰에서 돌려 보지 않은 게임 케이스 ${안돈.length}개 — ${안돈.join(' · ')}`]),
      ...(빨강.length === 0 ? [] : [`⚠️ 폰에서 빨간 게임 케이스 ${빨강.length}개 — ${빨강.join(' · ')}`]),
    ];
  } catch (e) {
    return [`⚠️ 게임 끝 검사를 못 했다 — ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`];
  }
}

/** 돌려 보기 마지막 모드가 앱 케이스를 뺄 때 찍는 줄 — 게임 작성이면 이 갈래를 가리킨다 */
export function 앱케이스말(앱: readonly string[], 폴더: string, env: NodeJS.ProcessEnv): string {
  const 까닭 = env[게임자료환경] ? `여기서 안 돌린다 — 게임 케이스는 \`npm run -s authoring:run -- 게임 ${폴더}\` 로 잡은 폰에서 1번씩 돌린다` : '폰이 없어 안 돌린다';
  return `[돌려 보기] 앱 케이스 ${앱.length}건은 ${까닭} — ${앱.join(' · ')}`;
}

function 돌리기(트리: string, 결과폴더: string, 이름: string, 파일들: readonly string[], 폰: string, 상한: number, env: NodeJS.ProcessEnv): Promise<number> {
  const 로그 = openSync(join(결과폴더, `${이름}.log`), 'w');
  const 인자 = ['playwright', 'test', ...파일들.map((f) => `tests/${f}`), '--project=android', '--workers=1', '--repeat-each=1', `--global-timeout=${Math.round(상한)}`, '--reporter=line,json'];
  const 자식 = spawn('npx', 인자, {
    cwd: 트리,
    env: { ...env, ...게임환경(폰), PLAYWRIGHT_JSON_OUTPUT_FILE: join(결과폴더, `${이름}.json`), PLATFORM_OUTPUT_ID: 이름 },
    stdio: ['ignore', 로그, 로그],
  });
  return new Promise((풀림) => {
    자식.on('close', (코드) => {
      closeSync(로그);
      풀림(코드 ?? 1);
    });
  });
}

/** `npm run authoring:run -- 게임 <폴더>` — 끝 코드는 웹 돌려 보기와 같다: 0 다 초록 · 1 빨강 · 2 돌릴 수 없음 · 3 남은 것(다시 부른다) */
export async function 게임실행(폴더: string | undefined, 트리: string, env: NodeJS.ProcessEnv): Promise<number> {
  const 결과폴더 = env.AUTHORING_GATE3_DIR;
  if (폴더 === undefined || !/^[A-Za-z0-9._-]+$/.test(폴더) || !결과폴더) {
    console.error('쓰는 법: npm run authoring:run -- 게임 <테스트 폴더> (작성 에이전트가 준 AUTHORING_GATE3_DIR 가 있어야 한다)');
    return 2;
  }
  if (!env[게임자료환경]) {
    console.error('[게임 돌려 보기] 게임 작성이 아니다 — 앱 케이스는 폰이 없어 안 돌린다');
    return 2;
  }
  const 목록 = 바뀐것(트리, env.AUTHORING_BASE_LIST);
  if ('까닭' in 목록) {
    console.error(`바뀐 파일을 못 읽었다: ${목록.까닭}`);
    return 2;
  }
  const 대상 = 게임대상(트리, 폴더, 목록);
  if (Object.keys(대상).length === 0) {
    console.log('[게임 돌려 보기] 돌릴 게임 케이스가 없다');
    return 0;
  }
  if (!env.PLATFORM_APPIUM_URL || !env.PLATFORM_APP) {
    console.error('[게임 돌려 보기] 디바이스 팜이 안 붙어 폰에서 못 돌린다 — 결과 요약 「3번 돌려 보기」 줄에 `안 돌림(디바이스 팜 없음)` 을 적는다');
    return 2;
  }
  if (!env.PLATFORM_BASE_URL) {
    console.error('[게임 돌려 보기] PLATFORM_BASE_URL 이 없다 — 앱 줄에 어드민 키가 없다. 프롬프트의 대상 서버 목록에서 앱 줄 주소를 골라 `PLATFORM_BASE_URL=<주소> npm run -s authoring:run -- 게임 …` 로 다시 부른다');
    return 2;
  }
  const 폰 = 잡은폰(트리);
  if (폰 === null) {
    console.error('[게임 돌려 보기] 잡은 폰이 없다 — `npx control-cli hold --minutes 30` 으로 잡고, 열어 둔 CLI 세션은 `npx control-cli -s=g close` 로 닫은 뒤 다시 부른다(케이스가 같은 폰에 새로 붙는다)');
    return 2;
  }
  const 읽기 = () => {
    const 판들 = 게임판들(결과폴더);
    return { 찾기: (파일: string) => 판들.get(파일), 시간들: [...판들.values()].flat().flatMap((p) => p.시간들) };
  };
  const 앞 = 읽기();
  const 할일 = 게임할일(대상, 앞.찾기);
  const 시작 = Date.now();
  let 이번: string[] = [];
  let 로그 = '';
  if (할일.length > 0) {
    // 앞 기록의 평균으로 예산 안에 드는 만큼 — 처음엔 어림이 커서 적게 돌고, 다음 차례는 배운 값으로 늘린다
    const 어림 = 앞.시간들.length === 0 ? 게임회차 : 앞.시간들.reduce((a, b) => a + b, 0) / 앞.시간들.length;
    이번 = 할일.slice(0, Math.max(1, Math.floor(예산 / 어림)));
    const 이름 = `gate3-game-${Math.max(0, ...readdirSync(결과폴더).map((n) => Number(/^gate3-game-(\d+)\.json$/.exec(n)?.[1] ?? 0))) + 1}`;
    로그 = join(결과폴더, `${이름}.log`);
    await 돌리기(트리, 결과폴더, 이름, 이번, 폰, 예산, env);
  }
  const 뒤 = 읽기();
  const 남은 = 게임할일(대상, 뒤.찾기);
  const 빨강 = 빨간게임(대상, 뒤.찾기);
  console.log(`[게임 돌려 보기] 폰 ${폰} · 게임 케이스 ${Object.keys(대상).length}건 가운데 이번 ${이번.length}건 · ${Math.round((Date.now() - 시작) / 1000)}초 · 기록 ${결과폴더}`);
  if (이번.length > 0 && 남은.length === 할일.length) {
    console.log(`돌렸지만 끝난 케이스가 없다 — 로그를 본다: ${로그}`);
    return 2;
  }
  if (빨강.length > 0) console.log([`빨강 ${빨강.length}건`, ...빨강.map((r) => `- ${r.파일}: ${r.오류}`)].join('\n'));
  if (남은.length > 0) {
    console.log(`남은 것 ${남은.length}건 — 같은 명령을 다시 부른다(30분이 지나면 폰을 놓고 다시 잡는다)`);
    return 3;
  }
  return 빨강.length > 0 ? 1 : 0;
}
