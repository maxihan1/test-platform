// 돌려 보기 명령의 폰 갈래 — AI 가 잡은 디바이스 팜 폰에서 이번에 바뀐 게임 · 앱 케이스를 1번씩 돌리고, 앱 작성 앞에 폰이 대상 서버에 닿는지 본다 (SPEC 도메인/게임 §3.10 「작성 — 한 바퀴」 6 · 도메인/작성 §3.6 「앱 화면」)
// 웹은 3번 · 느린 망이지만 폰 케이스는 케이스마다 1번이다(게임 결정 4 · 앱은 2026-10-26 PRD-F16-02 — 14678 이 앱 케이스 125건을 한 번도 안 돌리고 올렸다).
// 빈 폰과 폰마다 계정(「일반 회원 N」)이 있으면 여러 폰에 나눠 나란히 돈다 — 나누는 규칙은 authoring-phone-split (2026-11-16 · 작성 §3.6 「폰 여러 대로 나눠 돌린다」)
// 돌려 보기 명령(authoring-run3)이 `게임` · `앱` · `앱서버` 모드를 여기로 넘긴다 — 여기서 그 파일을 import 하지 않는다(그쪽 맨 위 await 와 엮이면 서로 기다린다)

import { spawn } from 'node:child_process';
import { closeSync, existsSync, lstatSync, openSync, readdirSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { type 돌린판, 돌린기록들, 판들읽기 } from './authoring-gate3.js';
import { 바뀐것 } from './authoring-base-list.js';
import { 게임자료환경 } from './authoring-check-game.js';
import { type 팜, 끊겼나, 덤폰놓기, 덤폰잡기, 빈폰질의, 폰목록, 폰이름 } from './authoring-phone-farm.js';
import {
  type 일, type 판정, 계정번호들, 끈묶음읽기, 끈묶음적기, 다음기록번호, 덤폰수, 묶음계정글, 묶음기록이름, 묶음짜기, 판정말들, 판정하기, 폰고르기, 표본말, 한판들, 혼자도나,
} from './authoring-phone-split.js';

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

/**
 * 돌릴 차례 — 앱 데이터를 남기는 케이스(`keepAppData: true`)를 앞에 모은다. 지우고 시작하는 케이스가 사이에 끼면 그다음 케이스가 다시 로그인한다
 * (도메인/러너 §5.2 「데이터 남기고 시작」). 거르지 않고 줄만 세운다 — 기록을 못 남기는 케이스 하나가 나머지를 막지 않게.
 * 두 묶음이 만나는 한 번은 섞여 돈다(Playwright 가 파일 이름 차례로 돈다)
 */
export function 폰차례(할일: readonly string[], 남기나: (파일: string) => boolean): string[] {
  return [...할일.filter(남기나), ...할일.filter((f) => !남기나(f))];
}

/**
 * 케이스 파일이 데이터 남기기를 골랐나 — 본문(`test(`) 앞의 선언만 글자로 본다(kit 을 불러 돌리면 케이스마다 수 초가 든다).
 * 틀려도 차례만 달라진다 — 연결 설정은 kit 이 선언을 읽어 정한다. 못 읽으면 지우는 쪽으로 본다
 */
export function 데이터남기나(트리: string, 파일: string): boolean {
  try {
    const 글 = 파일글(트리, 파일);
    const 본문 = 글.search(/^(?:export\s+default\s+)?test\(/m);
    return /\bkeepAppData:\s*true\b/.test(본문 === -1 ? 글 : 글.slice(0, 본문));
  } catch {
    return false;
  }
}

/** 케이스 파일 글 — 못 읽으면 빈 글(차례 · 혼자 도나만 본다) */
function 파일글(트리: string, 파일: string): string {
  try {
    return readFileSync(join(트리, 'tests', 파일), 'utf8');
  } catch {
    return '';
  }
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

/** 폰 기록을 파일마다 — 깨진 기록은 빼고 본다(그 파일을 다시 돌리면 된다) */
export function 폰판들(결과폴더: string, 갈래: 폰갈래 = '게임'): Map<string, 돌린판[]> {
  const 판들 = 판들읽기(돌린기록들(결과폴더, 기록꼴(갈래)), true)?.판들 ?? new Map<string, 돌린판[]>();
  return new Map([...판들].filter(([열쇠]) => 열쇠.endsWith('\0android')).map(([열쇠, 판]) => [열쇠.slice(0, -'\0android'.length), 판]));
}

/** 파일마다 지금 판정 — 이번에 쓸 수 있는 폰 · 계정을 주면 다시 볼 것도 고른다 */
export function 폰판정들(대상: Record<string, number>, 판들: Map<string, 돌린판[]>, 있는폰들: readonly string[] = [], 계정들: readonly number[] = [1]): [string, 판정][] {
  return Object.entries(대상)
    .map(([파일, 수정]): [string, 판정] => [파일, 판정하기(한판들(판들.get(파일), 수정), 있는폰들, 계정들)])
    .sort(([a], [b]) => a.localeCompare(b));
}

/**
 * 에이전트 끝 검사의 폰 줄 — 이번 작성이 닿은 게임 · 앱 케이스 가운데 고친 뒤 폰에서 안 돈 것 · 빨간 것 · 폰마다 결과가 다른 것 · 폰마다 계정으로만 빨간 것. 막지 않는다(작성 요약 머리에 싣는다).
 * 자식이 끝난 뒤 root 가 읽는다. 남은 다시 보기는 빨강으로 센다. 예외는 줄 하나로 — 이 검사로 올리기가 죽으면 안 된다
 */
export function 폰끝검사(결과폴더: string, 트리: string, 폴더: string, 바뀐: readonly string[], 갈래: 폰갈래 = '게임'): string[] {
  try {
    const 판들 = 폰판들(결과폴더, 갈래);
    const { 대상, 뺀기존 } = 폰고르기(트리, 폴더, 바뀐, 판들);
    const 판정들 = 폰판정들(대상, 판들);
    const 모음 = (...상태들: 판정['상태'][]) => 판정들.filter(([, p]) => 상태들.includes(p.상태));
    const 줄 = (말: string, 것들: [string, 판정][], 꼬리 = (_: 판정) => '') => (것들.length === 0 ? [] : [`⚠️ ${말} ${갈래} 케이스 ${것들.length}개 — ${것들.map(([f, p]) => f + 꼬리(p)).join(' · ')}`]);
    return [
      ...줄('폰에서 돌려 보지 않은', 모음('안돎')),
      ...(뺀기존.length === 0 ? [] : [표본말(뺀기존.length, Object.keys(대상).length, 갈래)]),
      ...줄('폰에서 빨간', 모음('빨강', '다시')),
      ...줄('폰마다 결과가 다른', 모음('폰차이'), (p) => (p.상태 === '폰차이' ? `(${p.빨간폰들.join(' · ')} 에서만 빨강)` : '')),
      ...줄('폰마다 계정(「일반 회원 N」)으로만 빨간', 모음('계정차이'), (p) => (p.상태 === '계정차이' ? `(일반 회원 ${p.계정})` : '')).map((l) => `${l} — 케이스 탓이 아니라 그 계정에 시드가 없을 수 있다(준비 주소를 본다)`),
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

/** 폰에 깔 앱 — 에이전트가 30분마다 갈아 끼우는 링크 파일(AUTHORING_APP_FILE)이 시작 때 받은 PLATFORM_APP(2시간 안에 403)보다 먼저다 (도메인/작성 §3.6 「링크 갈아 끼우기」) */
export function 폰앱링크(env: NodeJS.ProcessEnv): string | undefined {
  const 파일 = env.AUTHORING_APP_FILE;
  const 링크 = 파일 && existsSync(파일) ? readFileSync(파일, 'utf8').trim() : '';
  return 링크 || env.PLATFORM_APP;
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
export async function 폰실행(갈래: 폰갈래, 폴더: string | undefined, 트리: string, env: NodeJS.ProcessEnv, 부르기: typeof fetch = fetch): Promise<number> {
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
  const { 대상, 뺀기존 } = 폰고르기(트리, 폴더, 목록, 폰판들(결과폴더, 갈래));
  if (뺀기존.length > 0) console.log(`${머리} ${표본말(뺀기존.length, Object.keys(대상).length, 갈래).slice(3)}`);
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
  const 팜: 팜 = { 부르기, 주소: env.PLATFORM_APPIUM_URL.replace(/\/wd\/hub\/?$/, ''), 토큰: env.PLATFORM_APPIUM_TOKEN };
  const 앱 = 폰앱링크(env);
  const CLI폴더 = join(트리, `.${도구}`);
  // 앞 차례에 결과를 하나도 못 낸 덤 폰 · 폰마다 계정은 이 작성에서 다시 안 쓴다 — 같은 묶음을 끝없이 다시 부르지 않게
  const 끈것 = 끈묶음읽기(결과폴더);
  const 계정들 = 계정번호들(env.PLATFORM_ACCOUNTS, 주소).filter((k) => !끈것.계정들.has(k));
  const 팜목록 = await 폰목록(팜);
  // 잡은 폰이 끊겼으면 덤 폰으로만 돈다 — AI 가 놓고 다시 잡을 때까지 기다리지 않는다
  const 주폰 = 끊겼나(팜목록, 폰) ? null : 폰;
  const 혼자맵 = new Map(Object.keys(대상).map((f) => [f, 혼자도나(파일글(트리, f))]));
  const 일고르기 = (판들: Map<string, 돌린판[]>, 있는폰들: readonly string[]): 일[] =>
    폰판정들(대상, 판들, 있는폰들, 계정들).flatMap(([파일, p]): 일[] =>
      p.상태 === '안돎' ? [{ 파일, 계정: null, 뺄폰: null, 혼자: 혼자맵.get(파일)! }] : p.상태 === '다시' ? [{ 파일, 계정: p.계정, 뺄폰: p.뺄폰, 혼자: 혼자맵.get(파일)! }] : [],
    );
  const 판수 = (판들: Map<string, 돌린판[]>) => [...판들.values()].flat().reduce((합, p) => 합 + p.상태들.length, 0);
  const 앞판들 = 폰판들(결과폴더, 갈래);
  // 어림에만 쓴다 — 잡기는 팜이 고른다(덤폰잡기). 목록이 상태를 안 거른 팜이어도 IDLE 만 센다
  const 빈폰들 = ((await 폰목록(팜, 빈폰질의(앱))) ?? []).filter((p) => p.state === undefined || p.state === 'IDLE').map((p) => p.serial).filter((p) => p !== 폰 && !끈것.폰들.has(p));
  const 미리 = 일고르기(앞판들, [...(주폰 === null ? [] : [주폰]), ...빈폰들]);
  const 시작 = Date.now();
  let 묶음들: ReturnType<typeof 묶음짜기> = [];
  const 로그들: string[] = [];
  const 끊긴폰들: string[] = [];
  const 빈묶음들: { 폰: string; 계정: number; 로그: string }[] = [];
  // 잡은 뒤로는 무엇이 던져도 놓는다 — 놓기를 놓쳐도 held-<번호> 기록으로 에이전트가 끝에 놓는다
  const 잡은덤 = await 덤폰잡기(팜, Math.min(덤폰수(미리, 계정들, 주폰), 빈폰들.length), 앱, CLI폴더);
  const 덤 = 잡은덤.filter((p) => !끈것.폰들.has(p));
  const 폰들 = [...(주폰 === null ? [] : [주폰]), ...덤];
  try {
    // 팜이 고른 폰이 앞 차례에 끈 폰이면 바로 놓는다
    await 덤폰놓기(팜, 잡은덤.filter((p) => 끈것.폰들.has(p)), CLI폴더);
    if (폰들.length === 0) {
      console.error(`${머리} 잡은 폰 ${폰} 이 끊겼고 빈 폰도 없다 — \`npx ${도구} release\` 뒤 \`hold --minutes 30\` 으로 다시 잡고 부른다`);
      return 2;
    }
    // 앞 기록의 평균으로 묶음마다 예산 안에 드는 만큼 — 처음엔 어림이 커서 적게 돌고, 다음 차례는 배운 값으로 늘린다
    const 시간들 = [...앞판들.values()].flat().flatMap((p) => p.시간들);
    const 어림 = 시간들.length === 0 ? 게임회차 : 시간들.reduce((a, b) => a + b, 0) / 시간들.length;
    묶음들 = 묶음짜기(일고르기(앞판들, 폰들), 폰들, 계정들, Math.max(1, Math.floor(예산 / 어림)));
    const 번호 = 다음기록번호(readdirSync(결과폴더), 기록);
    await Promise.all(
      묶음들.map((b) => {
        const 이름 = 묶음기록이름(기록, 번호, b.폰, b.계정);
        로그들.push(join(결과폴더, `${이름}.log`));
        const 계정글 = 묶음계정글(env.PLATFORM_ACCOUNTS, 주소, b.계정);
        const 묶음env = { ...env, PLATFORM_BASE_URL: 주소, PLATFORM_APP: 앱, ...(계정글 === undefined ? {} : { PLATFORM_ACCOUNTS: 계정글 }) };
        return 돌리기(트리, 결과폴더, 이름, 폰차례(b.파일들, (f) => 데이터남기나(트리, f)), 폰환경(갈래, b.폰), 예산, 묶음env);
      }),
    );
    // 도중에 끊긴 폰의 기록은 버린다 — 연결 오류로 빨개진 케이스를 「폰 차이」로 읽지 않게. 그 케이스는 다음 차례에 남은 폰으로 다시 돈다
    const 뒤목록 = 묶음들.length > 0 ? await 폰목록(팜) : null;
    for (const b of 묶음들) {
      const 이름 = 묶음기록이름(기록, 번호, b.폰, b.계정);
      const 기록파일 = join(결과폴더, `${이름}.json`);
      if (끊겼나(뒤목록, b.폰)) {
        끊긴폰들.push(b.폰);
        if (existsSync(기록파일)) renameSync(기록파일, `${기록파일}.끊김`);
      } else if (![...폰판들(결과폴더, 갈래).values()].flat().some((p) => p.기록 === `${이름}.json`)) 빈묶음들.push({ 폰: b.폰, 계정: b.계정, 로그: join(결과폴더, `${이름}.log`) });
    }
    // 결과를 못 낸 묶음 — 잡은 폰 · 원래 계정이 아니면 그 폰(덤)과 그 계정(「일반 회원 N」)을 이 작성에서 끈다. 잡은 폰 · 원래 계정이면 지금처럼 로그를 보라고 한다
    for (const b of 빈묶음들) 끈묶음적기(결과폴더, b.폰 === 주폰 ? null : b.폰, b.계정 === 1 ? null : b.계정);
  } finally {
    await 덤폰놓기(팜, 덤, CLI폴더);
  }
  const 뒤판들 = 폰판들(결과폴더, 갈래);
  const 판정들 = 폰판정들(대상, 뒤판들, 폰들.filter((p) => !끊긴폰들.includes(p)), 계정들);
  const 모음 = (...상태들: 판정['상태'][]) => 판정들.filter(([, p]) => 상태들.includes(p.상태));
  const 이번 = 묶음들.reduce((합, b) => 합 + b.파일들.length, 0);
  const 묶음말 = 묶음들.map((b) => `${폰이름(팜목록, b.폰)}(${b.폰}) 계정 ${b.계정} · ${b.파일들.length}건`).join(' / ');
  console.log(`${머리} ${갈래} 케이스 ${Object.keys(대상).length}건 가운데 이번 ${이번}건${묶음말 ? ` — ${묶음말}` : ''} · ${Math.round((Date.now() - 시작) / 1000)}초 · 기록 ${결과폴더}`);
  if (계정들.length === 1 && 묶음들.length > 0 && 폰들.length === 1) console.log(`${머리} 폰 한 대로 돈다 — 앱 줄에 「일반 회원 2」 같은 폰마다 계정이 없거나 꺼 두었다`);
  if (끊긴폰들.length > 0) console.log(`${머리} 도중에 끊긴 폰 ${끊긴폰들.join(' · ')} — 그 폰 기록은 버렸다. 남은 것은 다음 차례에 다른 폰으로 돈다`);
  const 끈말 = 빈묶음들.filter((b) => b.폰 !== 주폰 || b.계정 !== 1);
  if (끈말.length > 0) console.log(`${머리} 결과를 못 낸 묶음 — ${끈말.map((b) => `${b.폰} 계정 ${b.계정}`).join(' · ')}. 그 덤 폰 · 계정은 이 작성에서 다시 안 쓴다 — 로그: ${끈말.map((b) => b.로그).join(' · ')}`);
  if (이번 > 0 && 끊긴폰들.length === 0 && 끈말.length === 0 && 판수(뒤판들) === 판수(앞판들)) {
    console.log(`돌렸지만 끝난 케이스가 없다 — 로그를 본다: ${로그들.join(' · ')}`);
    return 2;
  }
  const 빨강 = 모음('빨강');
  const 폰차이 = 모음('폰차이');
  const 계정차이 = 모음('계정차이');
  for (const 말 of 판정말들(빨강, 폰차이, 계정차이, (x) => 폰이름(팜목록, x))) console.log(말);
  const 남은 = 모음('안돎', '다시').length;
  if (남은 > 0) {
    console.log(`남은 것 ${남은}건(다시 보기 포함) — 같은 명령을 다시 부른다(30분이 지나면 폰을 놓고 다시 잡는다). 폰 연결이 끊긴 것 같으면 로그를 본다: ${로그들.join(' · ') || '이번에 안 돌림'}`);
    return 3;
  }
  return 빨강.length + 폰차이.length > 0 ? 1 : 0;
}
