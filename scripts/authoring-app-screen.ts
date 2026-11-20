// 앱 · 게임 첫 화면을 자료 폴더에 받아 둔다 — AI 가 러너에 닿지 않고 요소 주소를 고르게 (도메인/작성 §3.6 「앱 화면」 · §7 「앱 화면 통로」 · 도메인/게임 §7 「게임 첫 화면」)
// 기대값의 근거가 아니다 — 자식 지침(tpx-author references/app.md · game.md)이 그렇게 읽는다

import { existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { 기록읽기, 늘림잊기, 마지막늘림, 잡은기록들 } from './authoring-app-hold.js';
import { 부른다, 인증헤더 } from './authoring-io.js';
import { 비밀번호꼴가리기 } from './authoring-prd.js';
import { 거절말고 } from './authoring-prd-io.js';

/**
 * 탐색 — 작성 AI 가 appium-cli 로 팜 폰을 눌러 가며 읽을 주소 (§3.6 「앱 화면」 「눌러 가며 읽기」). 첫 화면을 못 읽었어도 붙는다.
 * token 은 서버가 첫 화면의 폰을 잡은 서버 몫 대신 PAT 다 — SSO 를 끈 설치 · 옛 서버는 없다 (§7 「앱 화면 통로」 appium.token)
 */
export type 앱탐색 = { url: string; app: string; token?: string };
/** 게임 — 게임 첫 화면 통로에서 왔다. 프롬프트 절 · 놓을 폰 기록 자리(control-cli)가 다르다 */
/** 문구 — APK 에서 꺼낸 앱 문구 파일(authoring-apk-strings). 옮기는 작성에만 붙는다 */
/** PC — PC 게임(집기 응답 gamePlatform 'windows')이다. 탐색의 app 은 Windows 빌드 zip 링크이고 패드는 집기 응답의 지원 패드다 (도메인/게임 §3.10 「작성 — PC 게임은 PC 에서 읽고 돌려 본다」) */
export type 앱화면 = ({ 글: string } | { 못읽음: string }) & { 탐색?: 앱탐색; 게임?: true; 문구?: string; PC?: { 패드: readonly string[] } };

/** 서버가 PC 게임에 주는 까닭 — 이 까닭인데 탐색이 없으면 팜이 안 붙은 것이다(빌드가 없으면 서버가 다른 까닭을 준다) */
const PC까닭 = 'PC 게임은 작성 AI 가 PC 에서 읽는다';

/**
 * PC 게임인데 PC 를 잡을 팜 주소나 깔 zip 링크가 없으면 자식을 띄우기 전에 멈출 까닭 — 폰 게임처럼 화면 없이 가면 AI 가 읽을 것이 없다.
 * 빌드가 없으면 서버가 그 까닭을 준다 (도메인/게임 §3.10 「윈도우 PC」 「Windows 빌드가 없으면 작성을 시작하지 못한다」)
 */
export function PC게임못함(앱: 앱화면 | undefined): string | null {
  if (앱?.PC === undefined || 앱.탐색 !== undefined) return null;
  const 까닭 = '못읽음' in 앱 && 앱.못읽음 !== PC까닭 ? 앱.못읽음 : 'Device VISION 이 연결되어 있지 않아 PC 를 잡을 수 없다';
  return `PC 게임 작성을 시작하지 못한다 — ${까닭}`;
}

/** 서버의 어느 통로에서 무엇을 받나. 기다림은 서버의 러너 기다림(앱 130 · 게임 285초)에 팜 잡기 · 놓기를 더한 것보다 길다 — 먼저 끊으면 폰을 읽는 중에 버린다 */
type 받을곳 = { 길: string; 파일: string; 칸: 'appium' | 'game'; 기다림_ms: number; 이름: string };
const 앱곳: 받을곳 = { 길: 'app-screen', 파일: 'app-screen.txt', 칸: 'appium', 기다림_ms: 180_000, 이름: '앱' };
const 게임곳: 받을곳 = { 길: 'game-screen', 파일: 'game-screen.txt', 칸: 'game', 기다림_ms: 360_000, 이름: '게임' };

export const 앱화면파일 = (자료: string): string => join(자료, 앱곳.파일);
export const 게임화면파일 = (자료: string): string => join(자료, 게임곳.파일);
/** 폰에 깔 앱 링크 — 자식의 폰 돌려 보기 · appium-cli · control-cli open 이 PLATFORM_APP 대신 읽는다. 에이전트가 자식이 도는 동안 갈아 끼운다(앱링크갈기) */
export const 앱링크파일 = (자료: string): string => join(자료, 'app-link.txt');
/** 팜 토큰 — 서버 몫 대신 PAT 는 3시간이라 링크와 같이 갈아 끼운다. 자식의 node 는 뜰 때 미리 읽기 모듈(authoring-farm-token.mjs)로 이 파일을 읽는다 */
export const 팜토큰파일 = (자료: string): string => join(자료, 'farm-token.txt');
const 팜토큰읽기모듈 = pathToFileURL(join(import.meta.dirname, 'authoring-farm-token.mjs')).href;
/** 이 에이전트가 받아 자식에게 준 팜 토큰 — 진척 · 올릴 것에서 가린다. 자리 여럿 것이 섞여도 더 가릴 뿐이다 */
export const 받은팜토큰 = new Set<string>();
// ponytail: 오래된 것부터 버리는 상한 하나. 서버 몫 토큰은 한 시간쯤에 하나 바뀌니 50개면 이틀 치다 — 끝난 토큰은 새어도 못 쓴다
const 받은팜토큰_상한 = 50;
/** 작성(자료 폴더)마다 마지막으로 갈아 끼운 토큰 — 남긴 폰 놓기가 쓴다. 자식이 바꿀 수 있는 파일은 다시 읽지 않는다 */
const 최신팜토큰 = new Map<string, string>();
/**
 * 작성(자료 폴더)마다 app-link 가 처음 알려 준 빌드 이름 — crawl 결과를 앱 조작 맵에 올릴 때 단다 (§3.6 「★ 앱 탐색」 「crawl 결과 → 맵 줄」).
 * 따로 부르지 않는다 — app-link 는 부를 때마다 서버가 팜 토큰을 챙겨 Auth 대신 PAT 한도를 쓴다. 처음 것을 지킨다 — crawl 은 작성 앞머리에 돈다
 */
const 빌드이름 = new Map<string, string>();
export const 받은빌드이름 = (자료: string): string | undefined => 빌드이름.get(자료);

/**
 * 자식을 띄우기 전에 부른다. 앱이 없는 서비스(경로가 없음)는 undefined — 프롬프트에 아무 절도 안 더한다.
 * 서버가 읽지 못한 까닭을 말했으면 그대로 돌려줘 자식이 화면을 짐작하지 않게 한다. 어느 경우도 작성은 간다.
 * 러너가 앱을 띄우는 일이라 다시 걸지 않는다 — 한 번 더 걸면 앱이 두 번 켜진다
 */
export const 앱화면받기 = (서버: { 주소기지: string; 토큰: string }, 번호: number, 자료: string): Promise<앱화면 | undefined> => 화면받기(서버, 번호, 자료, 앱곳);

/** 앱 조작 맵 글 — 경로 검색 명령(APP-F4-04)이 읽는다 */
export const 앱맵파일 = (자료: string): string => join(자료, 'app-route.txt');

/**
 * Android 앱 작성만 자식을 띄우기 전에 부른다 — 앱 조작 맵 글을 받아 둔다 (§3.6 「★ 앱 탐색」 · §7 「앱 조작 맵 통로」).
 * 못 받아도 작성은 간다(맵이 빈 것과 같아 길을 폰에서 찾는다). 앞 실행이 남긴 것은 먼저 지운다 — 이어받은 폴더에 낡은 맵이 보이면 안 된다
 */
export async function 앱맵받기(서버: { 주소기지: string; 토큰: string }, 번호: number, 자료: string): Promise<void> {
  const 못받음 = (왜: string) => console.error(`[작성] ${String(번호)}번 — 앱 조작 맵을 못 받았다(작성은 간다): ${왜}`);
  try {
    // 앞 자식이 그 이름으로 폴더를 심어 두었어도 작성이 서지 않게 — 지우기도 try 안에서 폴더째
    rmSync(앱맵파일(자료), { force: true, recursive: true });
    const 답 = await 부른다(서버.주소기지, 서버.토큰, `/authoring/requests/${String(번호)}/app-route`);
    const 글 = (답.몸 as { text?: unknown } | null)?.text;
    if (답.status === 200 && typeof 글 === 'string') writeFileSync(앱맵파일(자료), 글, { mode: 0o644, flag: 'wx' });
    else 못받음(`서버 ${String(답.status)}`);
  } catch (e) {
    // 토큰 거절(401 · 403)은 다시 던진다 — 줄 돌기가 그걸 보고 멈춘다
    못받음(거절말고(e));
  }
}

/**
 * 게임 애플리케이션(`/api/auth/me` 의 종류)만 부른다 — 게임 첫 화면 (도메인/게임 §7 「게임 첫 화면」). 늘 게임 표시가 붙은 값을 돌려준다:
 * 통로를 못 불렀어도(서버 오류 · 시간 초과) 게임 절 · 게임 지도 · 창 기록 올리기는 붙어야 한다 — 그때는 팜 주소를 몰라 CLI 탐색만 빠진다
 */
export async function 게임화면받기(서버: { 주소기지: string; 토큰: string }, 번호: number, 자료: string): Promise<앱화면> {
  const 답 = await 화면받기(서버, 번호, 자료, 게임곳);
  return { ...(답 ?? { 못읽음: '게임 화면 통로를 못 불렀다(서버 오류 · 시간 초과 — 에이전트 로그)' }), 게임: true };
}

async function 화면받기(서버: { 주소기지: string; 토큰: string }, 번호: number, 자료: string, 곳: 받을곳): Promise<앱화면 | undefined> {
  // 이어받은 자료 폴더에는 앞 실행이 받은 화면이 남아 있다. 이번에 못 읽었는데 옛 화면이 보이면 안 된다
  rmSync(join(자료, 곳.파일), { force: true });
  rmSync(앱링크파일(자료), { force: true });
  rmSync(팜토큰파일(자료), { force: true });
  최신팜토큰.delete(자료);
  빌드이름.delete(자료);
  try {
    const 답 = await fetch(`${서버.주소기지}/api/authoring/requests/${String(번호)}/${곳.길}`, {
      headers: 인증헤더(서버.토큰),
      signal: AbortSignal.timeout(곳.기다림_ms),
    });
    const 몸 = (await 답.json().catch(() => null)) as Record<string, unknown> | null;
    if (!답.ok) return 로그만(번호, 곳, `서버 ${답.status}`);
    const 탐색 = 탐색읽기(몸?.[곳.칸]);
    // 못 쓰면 자식은 시작 때 받은 PLATFORM_APP 으로 간다 — 2시간 안에는 같은 링크다
    if (탐색.탐색 !== undefined && !링크쓰기(앱링크파일(자료), 탐색.탐색.app)) console.error(`[작성] ${번호}번 — 앱 링크 파일을 못 썼다(시작 때 받은 링크로 간다)`);
    if (탐색.탐색?.token !== undefined) 토큰쓰기(번호, 자료, 탐색.탐색.token);
    if (typeof 몸?.screen === 'string') {
      // 로그인 직전 화면이라 계정 값은 없다. 그래도 「비밀번호: 값」 꼴은 가린다 — 서비스 가이드와 같은 손
      writeFileSync(join(자료, 곳.파일), 비밀번호꼴가리기(몸.screen), { mode: 0o644 });
      return { 글: join(자료, 곳.파일), ...탐색 };
    }
    if (몸?.screen === null && 몸.reason === null) return undefined;
    if (typeof 몸?.reason !== 'string') return 로그만(번호, 곳, '응답 모양이 틀리다');
    console.error(`[작성] ${번호}번 — ${곳.이름} 화면을 못 읽었다(작성은 간다): ${몸.reason}`);
    return { 못읽음: 몸.reason, ...탐색 };
  } catch (err) {
    return 로그만(번호, 곳, err instanceof Error ? err.name : '알 수 없는 오류');
  }
}

// 옛 서버는 칸이 없다 — 탐색 없이 첫 화면만 쓴다
function 탐색읽기(v: unknown): { 탐색?: 앱탐색 } {
  const a = v as { url?: unknown; app?: unknown; token?: unknown } | null | undefined;
  if (typeof a?.url !== 'string' || typeof a.app !== 'string') return {};
  return { 탐색: { url: a.url, app: a.app, ...(typeof a.token === 'string' && a.token !== '' && { token: a.token }) } };
}

/**
 * 자식 환경값 — appium-cli · control-cli 가 읽는 이름 그대로. 폰 번호는 안 준다(AI 가 hold 로 빈 폰을 잡는다).
 * 서버가 준 토큰은 이 컨테이너의 PLATFORM_APPIUM_TOKEN 을 덮는다 — AI 가 서버와 같은 주인으로 잡아야 팜이 받는다 (러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
 */
export function 탐색환경(앱: 앱화면 | undefined, 자료: string, 부모NODE_OPTIONS = process.env.NODE_OPTIONS): Record<string, string> {
  if (앱?.탐색 === undefined) return {};
  const { url, app, token } = 앱.탐색;
  // 서버가 토큰을 줬을 때만 파일로 갈아 끼운다 — 없으면(SSO 를 끈 설치) 이 컨테이너의 PLATFORM_APPIUM_TOKEN 그대로다
  // 미리 읽기 모듈이 없으면(다른 판 체크아웃) 자식의 node 가 전부 못 뜬다 — 그때는 갈아 끼우기 없이 시작 때 토큰으로 간다
  const 토큰칸: Record<string, string> = token === undefined ? {} : !existsSync(fileURLToPath(팜토큰읽기모듈)) ? { PLATFORM_APPIUM_TOKEN: token } : {
    PLATFORM_APPIUM_TOKEN: token,
    AUTHORING_FARM_TOKEN_FILE: 팜토큰파일(자료),
    NODE_OPTIONS: [부모NODE_OPTIONS, `--import=${팜토큰읽기모듈}`].filter((v) => v !== undefined && v !== '').join(' '),
  };
  return { PLATFORM_APPIUM_URL: url, PLATFORM_APP: app, AUTHORING_APP_FILE: 앱링크파일(자료), ...토큰칸 };
}

// 서명 링크는 받을 때 1~2시간 남는다(admin execution/buildFile.ts 서명주소). 30분마다 갈면 파일의 링크는 늘 30분 넘게 남는다
const 링크갈기_ms = 30 * 60_000;

/**
 * 자식이 도는 동안 앱 링크를 GET …/app-link 로 다시 받아 링크 파일에 갈아 끼운다 — 끄는 함수를 돌려준다 (§3.6 「앱 화면」 「링크 갈아 끼우기」).
 * 작성은 2~3시간이라 시작 때 받은 링크가 도중에 403 이 된다(11-12 MTA #15303). 못 받으면 앞 링크를 그대로 둔다. 탐색이 없으면(앱 · 팜 없음) 안 부른다
 */
export function 앱링크갈기(서버: { 주소기지: string; 토큰: string }, 번호: number, 자료: string, 앱: 앱화면 | undefined): () => void {
  if (앱?.탐색 === undefined) return () => undefined;
  // 시작 때 받은 빌드를 끝까지 깐다 — 도중에 새 빌드가 올라와도 케이스를 쓴 빌드와 돌려 보는 빌드가 같아야 한다. 그 빌드가 지워졌으면 서버가 최신 빌드를 준다
  const 빌드 = /\/api\/builds\/(\d+)\/apk\?/.exec(앱.탐색.app)?.[1];
  const 주소 = `${서버.주소기지}/api/authoring/requests/${String(번호)}/app-link${빌드 === undefined ? '' : `?build=${빌드}`}`;
  // 첫 화면을 받은 뒤 자식을 띄우기까지(자료 · 원장 준비)도 시간이 간다 — 띄울 때 한 번 받고 30분마다 받는다
  // 첫 화면 때 토큰을 받은 작성만 갈아 끼운다 — 그때 못 받았으면 자식은 컨테이너 토큰으로 잡았고 파일을 읽지도 않는다(놓기도 그 토큰이라야 한다)
  const 토큰도 = 앱.탐색.token !== undefined;
  void 링크받아쓰기(주소, 서버.토큰, 번호, 자료, 토큰도);
  const 타이머 = setInterval(() => void 링크받아쓰기(주소, 서버.토큰, 번호, 자료, 토큰도), 링크갈기_ms);
  return () => clearInterval(타이머);
}

async function 링크받아쓰기(주소: string, 토큰: string, 번호: number, 자료: string, 토큰도: boolean): Promise<void> {
  let 까닭: string;
  try {
    const 답 = await fetch(주소, { headers: 인증헤더(토큰), signal: AbortSignal.timeout(30_000) });
    const 몸 = (await 답.json().catch(() => null)) as { app?: unknown; token?: unknown; buildNo?: unknown } | null;
    // 토큰은 링크와 따로 갈아 끼운다 — 앱 줄이 바뀌어 링크를 못 받아도 잡은 폰은 놓아야 한다
    if (토큰도 && 답.ok && typeof 몸?.token === 'string' && 몸.token !== '') 토큰쓰기(번호, 자료, 몸.token);
    // 시작 링크가 빌드일 때만(?build=) — 빌드 없이 앱 파일 경로로 깔았으면 서버가 주는 최신 빌드 이름은 crawl 이 깐 앱이 아니다
    if (답.ok && 주소.includes('?build=') && typeof 몸?.buildNo === 'string' && !빌드이름.has(자료)) 빌드이름.set(자료, 몸.buildNo);
    if (답.ok && 몸?.app === null) 까닭 = '앱 줄에 앱이 없어졌다(설정 › 대상 서버의 앱 파일 경로 · 빌드)';
    else if (!답.ok || typeof 몸?.app !== 'string' || 몸.app === '') 까닭 = `서버 ${답.status}`;
    else if (링크쓰기(앱링크파일(자료), 몸.app)) return;
    else 까닭 = '파일을 못 썼다';
  } catch (err) {
    까닭 = err instanceof Error ? err.name : '알 수 없는 오류';
  }
  console.error(`[작성] ${번호}번 — 앱 링크를 새로 못 받아 앞 링크를 둔다: ${까닭}`);
}

function 토큰쓰기(번호: number, 자료: string, 토큰: string): void {
  받은팜토큰.delete(토큰);
  받은팜토큰.add(토큰);
  for (const 옛것 of 받은팜토큰) if (받은팜토큰.size > 받은팜토큰_상한) 받은팜토큰.delete(옛것);
  최신팜토큰.set(자료, 토큰);
  if (!링크쓰기(팜토큰파일(자료), 토큰)) console.error(`[작성] ${번호}번 — 팜 토큰 파일을 못 썼다(앞 토큰으로 간다)`);
}

/**
 * root 가 자식 폴더에 쓴다 — 자식이 심은 링크를 따라가지 않게 새 이름에 `wx` 로 쓰고 이름을 바꿔 한 번에 갈아 끼운다.
 * 지우고 다시 쓰면 그 사이에 `cat` 하는 자식이 빈 링크를 본다
 */
function 링크쓰기(파일: string, 링크: string): boolean {
  const 임시 = `${파일}.${String(process.pid)}.${String(Date.now())}`;
  try {
    writeFileSync(임시, 링크, { mode: 0o644, flag: 'wx' });
    renameSync(임시, 파일);
    return true;
  } catch {
    rmSync(임시, { force: true });
    return false;
  }
}

// 지침이 잡는 시간으로 정한 30분(references/app.md §5 · game.md 「폰 잡기」). 그보다 오래된 기록의 잡기는 팜이 이미 풀었다 —
// 그 폰을 지금 다른 실행이 잡았을 수 있고 인증 없는 팜은 누구의 잡기든 놓아 준다. 에이전트가 늘린 잡기(앱)는 늘린 때부터 센다
const 잡기_수명_ms = 30 * 60_000;

/** 잡은 폰을 놓거나 늘릴 팜 토큰 — AI 는 자식 환경의 PLATFORM_APPIUM_TOKEN(서버가 준 토큰 — 갈아 끼운 파일 것, 없으면 이 컨테이너 것)으로 잡았다. 잡은 계정과 같아야 팜이 받는다 */
export const 잡은폰토큰 = (앱: 앱화면 | undefined, 자료?: string): string | undefined =>
  (자료 === undefined ? undefined : 최신팜토큰.get(자료)) ?? 앱?.탐색?.token ?? process.env.PLATFORM_APPIUM_TOKEN;

/** 탐색 주소(…/wd/hub)에서 팜 주소 */
export const 팜주소 = (탐색: 앱탐색): string => 탐색.url.replace(/\/wd\/hub\/?$/, '');

/**
 * **자식을 거둔 뒤** 부른다 — 살아남은 자식이 놓은 뒤에 다시 잡지 않게. appium-cli 는 잡은 폰 번호를 작업 폴더의 `.appium-cli/held` 에, 게임의 control-cli 는 `.control-cli/held` 에 적는다(폰 돌려 보기가 더 잡은 폰은 `held-<번호>`) —
 * 남아 있으면 AI 가 release 를 잊은 것이다. 놓아야 팜이 깐 앱 · 앱 데이터를 지우고 정식 실행이 그 폰을 잡는다.
 * 자식이 쓴 파일이다 — 링크는 따라가지 않고(root 가 남의 파일을 읽어 로그 · 주소에 싣는다) 폰 번호 꼴만 받는다. 본 기록은 지운다(이어하기가 같은 폴더를 쓴다).
 * 실패해도 던지지 않는다 — 잡기는 시간이 끝나면 팜이 스스로 푼다
 */
export async function 잡은폰놓기(트리: string, 앱: 앱화면 | undefined, 번호: number, 부르기: typeof fetch = fetch, 지금 = Date.now(), 자료?: string): Promise<void> {
  if (앱?.탐색 === undefined) return;
  const 폴더 = join(트리, 앱.게임 === true ? '.control-cli' : '.appium-cli');
  // held 는 AI 가 잡은 폰, held-<번호> 는 폰 돌려 보기가 나눠 돌리려고 더 잡은 폰이다(작성 §3.6 「폰 여러 대로 나눠 돌린다」 — 그 명령이 죽으면 남는다)
  const 이름들 = 잡은기록들(폴더);
  if (이름들 === null) return void console.error(`[작성] ${번호}번 — 잡은 폰 기록 폴더가 보통 폴더가 아니라 놓지 않는다`);
  const 팜 = 팜주소(앱.탐색);
  const 누가 = (이름: string) => (이름 === 'held' ? 'AI 가' : '폰 돌려 보기 명령이(도중에 죽어)');
  const 토큰 = 잡은폰토큰(앱, 자료);
  for (const 이름 of 이름들) {
    const 기록 = 기록읽기(join(폴더, 이름));
    if (기록 === null) continue;
    if ('까닭' in 기록) {
      console.error(`[작성] ${번호}번 — 잡은 폰 기록이 ${기록.까닭} 놓지 않는다`);
      // 폰 번호 꼴이 아닌 보통 파일은 지운다 — 이어하기가 같은 폴더를 쓴다
      if (기록.까닭 === '폰 번호 꼴이 아니라') rmSync(join(폴더, 이름), { force: true });
      continue;
    }
    const serial = 기록.serial;
    rmSync(join(폴더, 이름), { force: true });
    const 늘림 = 마지막늘림(자료, serial);
    늘림잊기(자료, serial);
    if (지금 - Math.max(기록.mtimeMs, 늘림) > 잡기_수명_ms) continue;
    try {
      const res = await 부르기(`${팜}/api/devices/${encodeURIComponent(serial)}/hold`, {
        method: 'DELETE',
        headers: 토큰 ? { authorization: `Bearer ${토큰}` } : {},
        signal: AbortSignal.timeout(10_000),
      });
      // 409 는 이미 놓았거나 시간이 끝난 것이다 — 놓을 것이 없다
      const 말 = res.ok ? '놓았다' : res.status === 409 ? '이미 풀려 있었다' : '놓지 못했다';
      console.error(`[작성] ${번호}번 — ${누가(이름)} 잡아 둔 폰 ${serial} 을 ${말}: HTTP ${res.status}`);
    } catch (err) {
      console.error(`[작성] ${번호}번 — ${누가(이름)} 잡아 둔 폰 ${serial} 을 놓지 못했다: ${err instanceof Error ? err.name : '알 수 없는 오류'}`);
    }
  }
}

// 서버가 말한 까닭이 아닌 실패(옛 서버 · 끊김)는 앱이 있는지도 모른다 — 프롬프트를 안 바꾼다. 앱 없는 서비스가 달라지면 안 된다
function 로그만(번호: number, 곳: 받을곳, 까닭: string): undefined {
  console.error(`[작성] ${번호}번 — ${곳.이름} 화면 통로를 못 불렀다(작성은 간다): ${까닭}`);
  return undefined;
}
