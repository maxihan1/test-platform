// 돌려 보기 명령의 폰 갈래 — AI 가 잡은 디바이스 팜 폰에서 이번에 바뀐 게임 · 앱 케이스를 1번씩 돌리고, 앱 작성 앞에 폰이 대상 서버에 닿는지 본다 (SPEC 도메인/게임 §3.10 「작성 — 한 바퀴」 6 · 도메인/작성 §3.6 「앱 화면」)
// 웹은 3번 · 느린 망이지만 폰 케이스는 폰이 한 대라 케이스마다 1번이다(게임 결정 4 · 앱은 2026-10-26 PRD-F16-02 — 14678 이 앱 케이스 125건을 한 번도 안 돌리고 올렸다).
// 돌려 보기 명령(authoring-run3)이 `게임` · `앱` · `앱서버` 모드를 여기로 넘긴다 — 여기서 그 파일을 import 하지 않는다(그쪽 맨 위 await 와 엮이면 서로 기다린다)

import { spawn } from 'node:child_process';
import { closeSync, lstatSync, openSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type 돌린판, 돌린기록들, 앱케이스나누기, 케이스파일읽기, 살필케이스, 판들읽기 } from './authoring-gate3.js';
import { 바뀐것 } from './authoring-base-list.js';
import { 게임자료환경 } from './authoring-check-game.js';

/** 폰에서 도는 두 갈래 — 게임은 control-cli, 앱은 appium-cli 로 AI 가 폰을 잡는다. 기록 · 잡은 폰 파일 · CLI 세션 이름이 갈린다 */
export type 폰갈래 = '게임' | '앱';
const 갈래들 = {
  게임: { 기록: 'gate3-game', 도구: 'control-cli', 세션: 'g' },
  앱: { 기록: 'gate3-app', 도구: 'appium-cli', 세션: 'probe' },
} as const;

/** 폰 돌려 보기 기록 — 웹 3번 판정(`gate3-final` · `gate3-part-`)에 안 섞인다. 이어하기가 넘기는 꼴은 authoring-gate3 `기록남기며비우기` 에 따로 적혀 있다(그쪽이 이 파일을 못 부른다) */
const 기록꼴 = (갈래: 폰갈래) => new RegExp(`^${갈래들[갈래].기록}-.*\\.json$`);
/** 한 번 부를 때 돌릴 시간 — 웹 돌려 보기와 같다(Bash 10분 상한) */
const 예산 = 7.5 * 60_000;
/** 앞 기록이 없을 때 한 케이스 어림 — 앱을 깔거나 다시 켜고 상태를 만드는 몫 */
export const 게임회차 = 60_000;
const 폰번호꼴 = /^[A-Za-z0-9._:-]{1,64}$/;

/** 이번에 돌릴 폰 케이스 — 고친 뒤(수정 시각 뒤) android 로 돈 기록이 없는 것. 빨강이어도 돌았으면 끝이다(고치면 수정 시각이 바뀌어 다시 고른다) */
export function 폰할일(대상: Record<string, number>, 판들: (파일: string) => readonly 돌린판[] | undefined): string[] {
  return Object.entries(대상)
    .filter(([파일, 수정]) => !(판들(파일) ?? []).some((p) => Number.isFinite(p.시작) && p.시작 >= 수정))
    .map(([파일]) => 파일)
    .sort();
}

/**
 * AI 가 `npx control-cli hold`(게임) · `npx appium-cli hold`(앱)로 잡은 폰 번호 — 작업 폴더 `.<도구>/held`. 없거나 꼴이 아니면 null.
 * 자식이 쓴 파일이지만 이 명령도 자식이 돌린다 — 링크만 따라가지 않는다(에이전트의 잡은폰놓기와 같은 검사)
 */
export function 잡은폰(트리: string, 갈래: 폰갈래 = '게임'): string | null {
  const 기록 = join(트리, `.${갈래들[갈래].도구}`, 'held');
  const 정보 = lstatSync(기록, { throwIfNoEntry: false });
  if (정보 === undefined || !정보.isFile() || 정보.size > 100) return null;
  const 번호 = readFileSync(기록, 'utf8').trim();
  return 폰번호꼴.test(번호) ? 번호 : null;
}

/**
 * 폰 케이스가 갈 서버 — 게임은 어드민 키가 있으면 에이전트가 그 줄 주소를 `PLATFORM_BASE_URL` 로 넘겼다. 없으면 `PLATFORM_ACCOUNTS` 맨 앞(앱 줄 — 작성.md §3.6 「★ 역할별 계정」)의 주소.
 * 앱은 에이전트가 주소를 안 넘겨 `PLATFORM_BASE_URL` 이 AI 가 고른 것이다 — 프롬프트 서버 목록에는 어느 줄이 앱 줄인지 없어서 계정 맨 앞을 먼저 본다(`계정먼저`).
 * 둘 다 없으면 null — AI 가 주소를 고르면 키 · 계정과 다른 서버로 갈 수 있다
 */
export function 앱줄주소(env: NodeJS.ProcessEnv, 계정먼저 = false): string | null {
  let 첫줄: unknown;
  try {
    첫줄 = (JSON.parse(env.PLATFORM_ACCOUNTS || '[]') as { baseUrl?: unknown }[])[0]?.baseUrl;
  } catch {
    첫줄 = undefined;
  }
  const 계정줄 = typeof 첫줄 === 'string' && 첫줄 !== '' ? 첫줄 : null;
  return (계정먼저 ? (계정줄 ?? env.PLATFORM_BASE_URL) : (env.PLATFORM_BASE_URL || 계정줄)) || null;
}

/** kit 이 팜 폰에 붙는 환경값 — 정식 실행의 러너(execute.ts gameEnv)와 같다. 앱도 셋 다 적는다 — 셸의 게임 값을 물려받으면 kit 이 게임 설정으로 붙는다 */
export const 게임환경 = (폰: string): Record<string, string> => ({ PLATFORM_ENGINE: 'GAME', PLATFORM_GAME_LINK: 'farm', PLATFORM_DEVICE_UDID: 폰 });
const 폰환경 = (갈래: 폰갈래, 폰: string): Record<string, string> => (갈래 === '게임' ? 게임환경(폰) : { PLATFORM_ENGINE: '', PLATFORM_GAME_LINK: '', PLATFORM_DEVICE_UDID: 폰 });

/** 이번 작성이 닿은 폰 케이스(android 선언)와 그 케이스 · 부품 가운데 가장 늦은 수정 시각 — 웹 돌려 보기 · 끝 검사와 같은 함수로 고른다 */
export function 폰대상(트리: string, 폴더: string, 바뀐: readonly string[]): Record<string, number> {
  const 케이스들 = 케이스파일읽기(트리, 폴더);
  const 볼것 = 살필케이스(케이스들, new Set(바뀐.filter((p) => p.startsWith('tests/')).map((p) => p.slice('tests/'.length))));
  return Object.fromEntries(앱케이스나누기(케이스들, 볼것).앱.map((f) => [f, 볼것[f]!]));
}

/** 폰 기록을 파일마다 — 깨진 기록은 빼고 본다(그 파일을 다시 돌리면 된다) */
export function 폰판들(결과폴더: string, 갈래: 폰갈래 = '게임'): Map<string, 돌린판[]> {
  const 판들 = 판들읽기(돌린기록들(결과폴더, 기록꼴(갈래)), true)?.판들 ?? new Map<string, 돌린판[]>();
  return new Map([...판들].filter(([열쇠]) => 열쇠.endsWith('\0android')).map(([열쇠, 판]) => [열쇠.slice(0, -'\0android'.length), 판]));
}

/** 고친 뒤 가장 늦게 돈 기록이 빨간 파일과 그 첫 오류 줄 */
export function 빨간폰케이스(대상: Record<string, number>, 판들: (파일: string) => readonly 돌린판[] | undefined): { 파일: string; 오류: string }[] {
  return Object.entries(대상).flatMap(([파일, 수정]) => {
    const 새것 = (판들(파일) ?? []).filter((p) => p.시작 >= 수정);
    if (새것.length === 0) return [];
    const 늦은 = 새것.reduce((a, b) => (b.시작 > a.시작 ? b : a));
    return 늦은.상태들.includes('unexpected') ? [{ 파일, 오류: 늦은.오류 ?? '오류 글 없음' }] : [];
  });
}

/**
 * 에이전트 끝 검사의 폰 줄 — 이번 작성이 닿은 게임 · 앱 케이스 가운데 고친 뒤 폰에서 안 돈 것 · 빨간 것. 막지 않는다(작성 요약 머리에 싣는다).
 * 자식이 끝난 뒤 root 가 읽는다. 예외는 줄 하나로 — 이 검사로 올리기가 죽으면 안 된다
 */
export function 폰끝검사(결과폴더: string, 트리: string, 폴더: string, 바뀐: readonly string[], 갈래: 폰갈래 = '게임'): string[] {
  try {
    const 대상 = 폰대상(트리, 폴더, 바뀐);
    const 판들 = 폰판들(결과폴더, 갈래);
    const 안돈 = 폰할일(대상, (f) => 판들.get(f));
    const 빨강 = 빨간폰케이스(대상, (f) => 판들.get(f)).map((r) => r.파일);
    return [
      ...(안돈.length === 0 ? [] : [`⚠️ 폰에서 돌려 보지 않은 ${갈래} 케이스 ${안돈.length}개 — ${안돈.join(' · ')}`]),
      ...(빨강.length === 0 ? [] : [`⚠️ 폰에서 빨간 ${갈래} 케이스 ${빨강.length}개 — ${빨강.join(' · ')}`]),
    ];
  } catch (e) {
    return [`⚠️ ${갈래} 끝 검사를 못 했다 — ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`];
  }
}

/** 돌려 보기 마지막 모드가 앱 케이스를 뺄 때 찍는 줄 — 게임 작성이면 게임 갈래, 팜이 붙은 앱 작성이면 앱 갈래를 가리킨다 */
export function 앱케이스말(앱: readonly string[], 폴더: string, env: NodeJS.ProcessEnv): string {
  const 갈래 = env[게임자료환경] ? '게임' : env.PLATFORM_APPIUM_URL && env.PLATFORM_APP ? '앱' : null;
  const 까닭 = 갈래 === null ? '폰이 없어 안 돌린다' : `여기서 안 돌린다 — ${갈래} 케이스는 \`npm run -s authoring:run -- ${갈래} ${폴더}\` 로 잡은 폰에서 1번씩 돌린다`;
  return `[돌려 보기] 앱 케이스 ${앱.length}건은 ${까닭} — ${앱.join(' · ')}`;
}

function 돌리기(트리: string, 결과폴더: string, 이름: string, 파일들: readonly string[], 폰환경값: Record<string, string>, 상한: number, env: NodeJS.ProcessEnv): Promise<number> {
  const 로그 = openSync(join(결과폴더, `${이름}.log`), 'w');
  const 인자 = ['playwright', 'test', ...파일들.map((f) => `tests/${f}`), '--project=android', '--workers=1', '--repeat-each=1', `--global-timeout=${Math.round(상한)}`, '--reporter=line,json'];
  const 자식 = spawn('npx', 인자, {
    cwd: 트리,
    env: { ...env, ...폰환경값, PLAYWRIGHT_JSON_OUTPUT_FILE: join(결과폴더, `${이름}.json`), PLATFORM_OUTPUT_ID: 이름 },
    stdio: ['ignore', 로그, 로그],
  });
  return new Promise((풀림) => {
    자식.on('close', (코드) => {
      closeSync(로그);
      풀림(코드 ?? 1);
    });
  });
}

/** `npm run authoring:run -- 게임|앱 <폴더>` — 끝 코드는 웹 돌려 보기와 같다: 0 다 초록 · 1 빨강 · 2 돌릴 수 없음 · 3 남은 것(다시 부른다) */
export async function 폰실행(갈래: 폰갈래, 폴더: string | undefined, 트리: string, env: NodeJS.ProcessEnv): Promise<number> {
  const 결과폴더 = env.AUTHORING_GATE3_DIR;
  const 머리 = `[${갈래} 돌려 보기]`;
  const { 기록, 도구, 세션 } = 갈래들[갈래];
  if (폴더 === undefined || !/^[A-Za-z0-9._-]+$/.test(폴더) || !결과폴더) {
    console.error(`쓰는 법: npm run authoring:run -- ${갈래} <테스트 폴더> (작성 에이전트가 준 AUTHORING_GATE3_DIR 가 있어야 한다)`);
    return 2;
  }
  // 게임 작성의 android 케이스는 게임 케이스다 — 앱 갈래로 돌리면 kit 이 게임 설정 없이 붙는다
  if (갈래 === '게임' ? !env[게임자료환경] : env[게임자료환경]) {
    console.error(갈래 === '게임' ? `${머리} 게임 작성이 아니다 — 앱 케이스는 \`앱 ${폴더}\` 로 돌린다` : `${머리} 게임 작성이다 — \`게임 ${폴더}\` 로 돌린다`);
    return 2;
  }
  const 목록 = 바뀐것(트리, env.AUTHORING_BASE_LIST);
  if ('까닭' in 목록) {
    console.error(`바뀐 파일을 못 읽었다: ${목록.까닭}`);
    return 2;
  }
  const 대상 = 폰대상(트리, 폴더, 목록);
  if (Object.keys(대상).length === 0) {
    console.log(`${머리} 돌릴 ${갈래} 케이스가 없다`);
    return 0;
  }
  if (!env.PLATFORM_APPIUM_URL || !env.PLATFORM_APP) {
    console.error(`${머리} 디바이스 팜이 안 붙어 폰에서 못 돌린다 — 결과 요약 「3번 돌려 보기」 줄에 \`안 돌림(디바이스 팜 없음)\` 을 적는다`);
    return 2;
  }
  const 주소 = 앱줄주소(env, 갈래 === '앱');
  if (주소 === null) {
    console.error(`${머리} 앱 줄을 모른다(어드민 키 · 계정이 없다) — 폰에서 못 돌린다. 결과 요약 「3번 돌려 보기」 줄에 \`안 돌림(앱 줄 모름)\` 을 적는다`);
    return 2;
  }
  const 폰 = 잡은폰(트리, 갈래);
  if (폰 === null) {
    console.error(`${머리} 잡은 폰이 없다 — \`npx ${도구} hold --minutes 30\` 으로 잡고, 열어 둔 CLI 세션은 \`npx ${도구} -s=${세션} close\` 로 닫은 뒤 다시 부른다(케이스가 같은 폰에 새로 붙는다)`);
    return 2;
  }
  const 읽기 = () => {
    const 판들 = 폰판들(결과폴더, 갈래);
    return { 찾기: (파일: string) => 판들.get(파일), 시간들: [...판들.values()].flat().flatMap((p) => p.시간들) };
  };
  const 앞 = 읽기();
  const 할일 = 폰할일(대상, 앞.찾기);
  const 시작 = Date.now();
  let 이번: string[] = [];
  let 로그 = '';
  if (할일.length > 0) {
    // 앞 기록의 평균으로 예산 안에 드는 만큼 — 처음엔 어림이 커서 적게 돌고, 다음 차례는 배운 값으로 늘린다
    const 어림 = 앞.시간들.length === 0 ? 게임회차 : 앞.시간들.reduce((a, b) => a + b, 0) / 앞.시간들.length;
    이번 = 할일.slice(0, Math.max(1, Math.floor(예산 / 어림)));
    const 번호꼴 = new RegExp(`^${기록}-(\\d+)\\.json$`);
    const 이름 = `${기록}-${Math.max(0, ...readdirSync(결과폴더).map((n) => Number(번호꼴.exec(n)?.[1] ?? 0))) + 1}`;
    로그 = join(결과폴더, `${이름}.log`);
    await 돌리기(트리, 결과폴더, 이름, 이번, 폰환경(갈래, 폰), 예산, { ...env, PLATFORM_BASE_URL: 주소 });
  }
  const 뒤 = 읽기();
  const 남은 = 폰할일(대상, 뒤.찾기);
  const 빨강 = 빨간폰케이스(대상, 뒤.찾기);
  console.log(`${머리} 폰 ${폰} · ${갈래} 케이스 ${Object.keys(대상).length}건 가운데 이번 ${이번.length}건 · ${Math.round((Date.now() - 시작) / 1000)}초 · 기록 ${결과폴더}`);
  if (이번.length > 0 && 남은.length === 할일.length) {
    console.log(`돌렸지만 끝난 케이스가 없다 — 로그를 본다: ${로그}`);
    return 2;
  }
  if (빨강.length > 0) console.log([`빨강 ${빨강.length}건`, ...빨강.map((r) => `- ${r.파일}: ${r.오류}`)].join('\n'));
  if (남은.length > 0) {
    console.log(`남은 것 ${남은.length}건 — 같은 명령을 다시 부른다(30분이 지나면 폰을 놓고 다시 잡는다). 시간 상한이 아니라 폰 연결이 끊긴 것 같으면 로그를 본다: ${로그 || '이번에 안 돌림'}`);
    return 3;
  }
  return 빨강.length > 0 ? 1 : 0;
}

/**
 * 폰 안에서 두드려 볼 자리 — 맥에 뜬 대상 서버(localhost · host.docker.internal)는 디바이스 팜이 폰의 127.0.0.1 같은 포트로 잇는다
 * (팜 설정 `DF_REVERSE_PORTS` 의 `adb reverse` — Devicefarm INT-F13-12 · PR #63). 그 밖의 주소는 폰이 제 망으로 그대로 간다. 주소가 아니면 null
 */
export function 폰에서볼자리(주소: string): { 호스트: string; 포트: number } | null {
  let u: URL;
  try {
    u = new URL(주소);
  } catch {
    return null;
  }
  const 포트 = u.port !== '' ? Number(u.port) : u.protocol === 'https:' ? 443 : u.protocol === 'http:' ? 80 : null;
  if (포트 === null) return null;
  const 맥 = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0', 'host.docker.internal'].includes(u.hostname);
  return { 호스트: 맥 ? '127.0.0.1' : u.hostname, 포트 };
}

export type 두드린결과 = { 닿음: boolean } | { 모름: string };

/** `nc -z … ; echo rc=$?` 의 답. -z 가 없는 옛 toybox · nc 가 없는 폰 · 끝 코드가 없는 답은 닿는지 모른다 — 못 닿음으로 치면 멀쩡한 작성을 멈춘다 */
export function nc답읽기(답: { stdout?: string; stderr?: string }): 두드린결과 {
  const 끝코드 = /rc=(\d+)/.exec(답.stdout ?? '')?.[1];
  const 오류 = (답.stderr ?? '').trim().split('\n')[0] ?? '';
  if (끝코드 === undefined || /unknown option|usage|not found|inaccessible/i.test(오류)) return { 모름: 오류 || '폰이 끝 코드를 안 돌려줬다' };
  return { 닿음: 끝코드 === '0' };
}

/** 잡은 폰에 앱 없이 붙어 `nc -z` 로 포트를 두드린다. 팜이 연 adb 명령 길(`uiautomator2:adb_shell` — 러너 §5.2 「디바이스 팜 접속 방식」)을 쓴다 */
async function 폰에서두드리기(appium: string, 폰: string, 자리: { 호스트: string; 포트: number }, token: string | undefined): Promise<두드린결과> {
  const url = new URL(appium);
  const { remote } = await import('webdriverio');
  let 연결: Awaited<ReturnType<typeof remote>>;
  try {
    // kit openApp 과 같은 조각으로 붙는다 — 앱을 안 깔아 빠르고, 놓을 때 팜 정리가 돈다
    연결 = await remote({
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
      path: url.pathname,
      logLevel: 'error',
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : url.username && { user: decodeURIComponent(url.username), key: decodeURIComponent(url.password) }),
      capabilities: { platformName: 'Android', 'appium:automationName': 'UiAutomator2', 'appium:udid': 폰 },
    });
  } catch (e) {
    return { 모름: `폰에 못 붙었다 — ${e instanceof Error ? e.message.split('\n')[0] : String(e)}` };
  }
  try {
    // 끝 코드를 글로 받는다 — 옛 adb(shell v2 없음)는 끝 코드를 안 넘겨 던지기만으로는 거절도 닿음으로 읽힌다. `;` 뒤는 폰 셸이 읽는다
    return nc답읽기((await 연결.execute('mobile: shell', { command: 'nc', args: ['-z', '-w', '3', 자리.호스트, String(자리.포트), ';', 'echo', 'rc=$?'], includeStderr: true })) as { stdout?: string; stderr?: string });
  } catch (e) {
    // 명령이 안 돌았다 — 팜이 adb 명령 길을 닫았거나 세션이 끊겼다
    return { 모름: e instanceof Error ? e.message.split('\n')[0]! : String(e) };
  } finally {
    await 연결.deleteSession().catch(() => undefined);
  }
}

/**
 * `npm run authoring:run -- 앱서버` — 앱 작성이 폰을 잡은 직후 폰이 대상 서버에 닿는지. 0 닿음 · 1 못 닿음(케이스를 쓰기 전에 멈춘다) · 2 확인 못 함(지금처럼 간다).
 * 14677 이 폰에서 서버에 못 닿은 결과를 「공백 비밀번호가 안 막힘」으로 읽었다 (작성 §3.6 「앱 화면」 「서버에 닿는지」 · 2026-10-26 PRD-F16-02)
 */
export async function 앱서버확인(트리: string, env: NodeJS.ProcessEnv, 두드리기: typeof 폰에서두드리기 = 폰에서두드리기): Promise<number> {
  const 머리 = '[앱 서버]';
  const 모름 = (까닭: string) => {
    console.error(`${머리} 닿는지 확인 못 함 — ${까닭}. 멈추지 않고 간다 — 결과 요약 「못 읽은 자료」 줄에 \`앱 서버 — 확인 못 함(${까닭})\` 을 적는다`);
    return 2;
  };
  if (!env.PLATFORM_APPIUM_URL) return 모름('디바이스 팜이 안 붙었다');
  const 주소 = 앱줄주소(env, true);
  if (주소 === null) return 모름('앱 줄을 모른다(계정이 없다)');
  const 자리 = 폰에서볼자리(주소);
  if (자리 === null) return 모름(`주소 꼴이 아니다: ${주소}`);
  const 폰 = 잡은폰(트리, '앱');
  if (폰 === null) return 모름('잡은 폰이 없다 — `npx appium-cli hold --minutes 30` 뒤에 부른다');
  const 결과 = await 두드리기(env.PLATFORM_APPIUM_URL, 폰, 자리, env.PLATFORM_APPIUM_TOKEN);
  if ('모름' in 결과) return 모름(결과.모름);
  const 어디 = `${주소}(폰에서 ${자리.호스트}:${자리.포트})`;
  if (결과.닿음) {
    console.log(`${머리} 폰 ${폰} 이 ${어디} 에 닿는다`);
    return 0;
  }
  console.log(
    `${머리} 폰 ${폰} 이 ${어디} 에 못 닿는다 — 케이스를 쓰지 않는다. \`close\` → \`release\` 로 폰을 놓고, 결과 요약 「못 읽은 자료」 줄에 \`앱 서버 — 폰에서 ${어디} 에 못 닿음\` 을 적고 끝낸다` +
      ' (맥의 서버면 디바이스 팜을 그 포트의 DF_REVERSE_PORTS 로 띄웠는지 사람이 본다)',
  );
  return 1;
}
