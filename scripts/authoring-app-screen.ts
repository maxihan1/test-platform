// 앱 · 게임 첫 화면을 자료 폴더에 받아 둔다 — AI 가 러너에 닿지 않고 요소 주소를 고르게 (도메인/작성 §3.6 「앱 화면」 · §7 「앱 화면 통로」 · 도메인/게임 §7 「게임 첫 화면」)
// 기대값의 근거가 아니다 — 자식 지침(tpx-author references/app.md · game.md)이 그렇게 읽는다

import { lstatSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { 인증헤더 } from './authoring-io.js';
import { 비밀번호꼴가리기 } from './authoring-prd.js';

/** 탐색 — 작성 AI 가 appium-cli 로 팜 폰을 눌러 가며 읽을 주소 (§3.6 「앱 화면」 「눌러 가며 읽기」). 첫 화면을 못 읽었어도 붙는다 */
export type 앱탐색 = { url: string; app: string };
/** 게임 — 게임 첫 화면 통로에서 왔다. 프롬프트 절 · 놓을 폰 기록 자리(control-cli)가 다르다 */
export type 앱화면 = ({ 글: string } | { 못읽음: string }) & { 탐색?: 앱탐색; 게임?: true };

/** 서버의 어느 통로에서 무엇을 받나. 기다림은 서버의 러너 기다림(앱 110 · 게임 230초)보다 길다 — 먼저 끊으면 폰을 읽는 중에 버린다 */
type 받을곳 = { 길: string; 파일: string; 칸: 'appium' | 'game'; 기다림_ms: number; 이름: string };
const 앱곳: 받을곳 = { 길: 'app-screen', 파일: 'app-screen.txt', 칸: 'appium', 기다림_ms: 180_000, 이름: '앱' };
const 게임곳: 받을곳 = { 길: 'game-screen', 파일: 'game-screen.txt', 칸: 'game', 기다림_ms: 300_000, 이름: '게임' };

export const 앱화면파일 = (자료: string): string => join(자료, 앱곳.파일);
export const 게임화면파일 = (자료: string): string => join(자료, 게임곳.파일);

/**
 * 자식을 띄우기 전에 부른다. 앱이 없는 서비스(경로가 없음)는 undefined — 프롬프트에 아무 절도 안 더한다.
 * 서버가 읽지 못한 까닭을 말했으면 그대로 돌려줘 자식이 화면을 짐작하지 않게 한다. 어느 경우도 작성은 간다.
 * 러너가 앱을 띄우는 일이라 다시 걸지 않는다 — 한 번 더 걸면 앱이 두 번 켜진다
 */
export const 앱화면받기 = (서버: { 주소기지: string; 토큰: string }, 번호: number, 자료: string): Promise<앱화면 | undefined> => 화면받기(서버, 번호, 자료, 앱곳);

/** 게임 애플리케이션이면 게임 첫 화면 — 서버가 종류로 갈라 게임이 아니면 undefined 다. 앱 화면과 나란히 부르고 둘 중 온 것을 쓴다 (도메인/게임 §7 「게임 첫 화면」) */
export async function 게임화면받기(서버: { 주소기지: string; 토큰: string }, 번호: number, 자료: string): Promise<앱화면 | undefined> {
  const 답 = await 화면받기(서버, 번호, 자료, 게임곳);
  return 답 === undefined ? undefined : { ...답, 게임: true };
}

async function 화면받기(서버: { 주소기지: string; 토큰: string }, 번호: number, 자료: string, 곳: 받을곳): Promise<앱화면 | undefined> {
  // 이어받은 자료 폴더에는 앞 실행이 받은 화면이 남아 있다. 이번에 못 읽었는데 옛 화면이 보이면 안 된다
  rmSync(join(자료, 곳.파일), { force: true });
  try {
    const 답 = await fetch(`${서버.주소기지}/api/authoring/requests/${String(번호)}/${곳.길}`, {
      headers: 인증헤더(서버.토큰),
      signal: AbortSignal.timeout(곳.기다림_ms),
    });
    const 몸 = (await 답.json().catch(() => null)) as Record<string, unknown> | null;
    if (!답.ok) return 로그만(번호, 곳, `서버 ${답.status}`);
    const 탐색 = 탐색읽기(몸?.[곳.칸]);
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
  const a = v as { url?: unknown; app?: unknown } | null | undefined;
  return typeof a?.url === 'string' && typeof a.app === 'string' ? { 탐색: { url: a.url, app: a.app } } : {};
}

/** 자식 환경값 — appium-cli · control-cli 가 읽는 이름 그대로. 폰 번호는 안 준다(AI 가 hold 로 빈 폰을 잡는다) */
export function 탐색환경(앱: 앱화면 | undefined): Record<string, string> {
  return 앱?.탐색 === undefined ? {} : { PLATFORM_APPIUM_URL: 앱.탐색.url, PLATFORM_APP: 앱.탐색.app };
}

// 지침이 잡는 시간으로 정한 30분(references/app.md §5 · game.md 「폰 잡기」). 그보다 오래된 기록의 잡기는 팜이 이미 풀었다 —
// 그 폰을 지금 다른 실행이 잡았을 수 있고 인증 없는 팜은 누구의 잡기든 놓아 준다
const 잡기_수명_ms = 30 * 60_000;
const 폰번호꼴 = /^[A-Za-z0-9._:-]{1,64}$/;

/**
 * **자식을 거둔 뒤** 부른다 — 살아남은 자식이 놓은 뒤에 다시 잡지 않게. appium-cli 는 잡은 폰 번호를 작업 폴더의 `.appium-cli/held` 에, 게임의 control-cli 는 `.control-cli/held` 에 적는다 —
 * 남아 있으면 AI 가 release 를 잊은 것이다. 놓아야 팜이 깐 앱 · 앱 데이터를 지우고 정식 실행이 그 폰을 잡는다.
 * 자식이 쓴 파일이다 — 링크는 따라가지 않고(root 가 남의 파일을 읽어 로그 · 주소에 싣는다) 폰 번호 꼴만 받는다. 본 기록은 지운다(이어하기가 같은 폴더를 쓴다).
 * 실패해도 던지지 않는다 — 잡기는 시간이 끝나면 팜이 스스로 푼다
 */
export async function 잡은폰놓기(트리: string, 앱: 앱화면 | undefined, 번호: number, 부르기: typeof fetch = fetch, 지금 = Date.now()): Promise<void> {
  if (앱?.탐색 === undefined) return;
  const 폴더 = join(트리, 앱.게임 === true ? '.control-cli' : '.appium-cli');
  const 기록 = join(폴더, 'held');
  let serial: string;
  try {
    const 폴더정보 = lstatSync(폴더);
    const 정보 = lstatSync(기록);
    if (!폴더정보.isDirectory() || !정보.isFile() || 정보.size > 100) return void console.error(`[작성] ${번호}번 — 잡은 폰 기록이 보통 파일이 아니라 놓지 않는다`);
    serial = readFileSync(기록, 'utf8').trim();
    rmSync(기록, { force: true });
    if (지금 - 정보.mtimeMs > 잡기_수명_ms) return;
  } catch {
    return;
  }
  if (!폰번호꼴.test(serial)) return void console.error(`[작성] ${번호}번 — 잡은 폰 기록이 폰 번호 꼴이 아니라 놓지 않는다`);
  const 팜 = 앱.탐색.url.replace(/\/wd\/hub\/?$/, '');
  try {
    const res = await 부르기(`${팜}/api/devices/${encodeURIComponent(serial)}/hold`, { method: 'DELETE', signal: AbortSignal.timeout(10_000) });
    // 409 는 이미 놓았거나 시간이 끝난 것이다 — 놓을 것이 없다
    const 말 = res.ok ? '놓았다' : res.status === 409 ? '이미 풀려 있었다' : '놓지 못했다';
    console.error(`[작성] ${번호}번 — AI 가 잡아 둔 폰 ${serial} 을 ${말}: HTTP ${res.status}`);
  } catch (err) {
    console.error(`[작성] ${번호}번 — AI 가 잡아 둔 폰 ${serial} 을 놓지 못했다: ${err instanceof Error ? err.name : '알 수 없는 오류'}`);
  }
}

// 서버가 말한 까닭이 아닌 실패(옛 서버 · 끊김)는 앱이 있는지도 모른다 — 프롬프트를 안 바꾼다. 앱 없는 서비스가 달라지면 안 된다
function 로그만(번호: number, 곳: 받을곳, 까닭: string): undefined {
  console.error(`[작성] ${번호}번 — ${곳.이름} 화면 통로를 못 불렀다(작성은 간다): ${까닭}`);
  return undefined;
}
