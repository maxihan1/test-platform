// Device VISION 에서 윈도우 PC 를 잡아 게임 zip 을 깔고 일을 맡긴 뒤 놓는다 — 정식 실행 · 케이스 테스트 실행이 쓴다 (도메인/게임 §3.10 「실행 하나의 흐름」)

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { 팜머리, 폰을돌려준다 } from './farm.js';

// 회귀 실행이 몇 시간이어도 끊기지 않게 팜이 받는 가장 긴 잡기로 잡고 항목마다 늘린다 — 폰 게임 실행과 같다
const 잡는_분 = 120;
const 팜_제한_ms = 10_000;
// VISION 이 1GB 까지 받고 풀기를 5분까지 기다린다 — 올리는 시간까지 넉넉히
const 깔기_제한_ms = 10 * 60_000;
// 정식 실행이 빈 PC 를 기다리는 한도와 다시 보는 틈
export const PC기다림_ms = 120 * 60_000;
const 다시_잡기_ms = 60_000;

/** 잡고 깐 PC — 러너에 udid · app 으로 보낸다 */
export interface 잡은PC {
  serial: string;
  게임: string;
  화면: string | undefined;
}

type 잡기답 = { 잡음: { serial: string; 화면: string | undefined } } | { 거절: string; 다시: boolean };

const 웹주소 = (값: unknown): string | undefined => (typeof 값 === 'string' && /^https?:\/\//.test(값) ? 값 : undefined);

/**
 * 조건 잡기로 빈 PC 하나를 잡는다 — platform 조건이 없으면 VISION 은 폰만 고른다.
 * 409 는 모두 잡힘 · 정리 중 · 남의 예약 · PC 가 끊김이라 기다리면 풀릴 수 있다(다시). 그 밖은 기다려도 안 풀린다.
 * 답을 못 받으면(끊김 · 제한 시간) 던진다 — 다시 부르면 PC 를 하나 더 잡는다(VISION 안내서 4절)
 */
async function 잡는다(팜: string, 토큰: string | undefined, 부르기: typeof fetch): Promise<잡기답> {
  const res = await 부르기(`${팜}/api/devices/acquire`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...팜머리(process.env, 토큰) },
    body: JSON.stringify({ minutes: 잡는_분, filter: 'platform=windows' }),
    signal: AbortSignal.timeout(팜_제한_ms),
  });
  const 몸 = ((await res.json().catch(() => null)) as { value?: { refused?: unknown; held?: { serial?: unknown; screen?: unknown } } } | null)?.value;
  if (res.ok && typeof 몸?.held?.serial === 'string' && 몸.held.serial !== '') return { 잡음: { serial: 몸.held.serial, 화면: 웹주소(몸.held.screen) } };
  const 까닭 = typeof 몸?.refused === 'string' ? 몸.refused : `HTTP ${String(res.status)}`;
  return { 거절: res.status === 409 ? `빈 Windows PC 가 없습니다 — ${까닭}` : `Device VISION 이 Windows PC 를 내주지 않았습니다: ${까닭}`, 다시: res.status === 409 };
}

/** 고정한 zip 을 잡은 PC 에 깐다 — 본문은 zip 바이트 그대로. 깐 게임 이름(exe 이름)이나 거절 문장 */
export async function 깐다(팜: string, serial: string, zip: string, 토큰: string | undefined, 부르기: typeof fetch = fetch): Promise<{ 게임: string } | { 까닭: string }> {
  try {
    const 크기 = (await stat(zip)).size;
    const res = await 부르기(`${팜}/api/devices/${encodeURIComponent(serial)}/install`, {
      method: 'POST',
      headers: { 'content-type': 'application/zip', 'content-length': String(크기), ...팜머리(process.env, 토큰) },
      // 1GB 까지라 메모리에 안 올리고 흘려보낸다
      body: Readable.toWeb(createReadStream(zip)) as ReadableStream,
      duplex: 'half',
      signal: AbortSignal.timeout(깔기_제한_ms),
    } as RequestInit);
    const 몸 = ((await res.json().catch(() => null)) as { value?: { game?: unknown; message?: unknown; refused?: unknown } } | null)?.value;
    if (res.ok && typeof 몸?.game === 'string' && 몸.game !== '') return { 게임: 몸.game };
    const 까닭 = typeof 몸?.message === 'string' ? 몸.message : typeof 몸?.refused === 'string' ? 몸.refused : `HTTP ${String(res.status)}`;
    return { 까닭: `Device VISION 이 Windows 빌드를 깔지 못했습니다: ${까닭}` };
  } catch (err) {
    return { 까닭: `Windows 빌드를 깔지 못했습니다: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export interface PC잡기설정 {
  // 0 이면 기다리지 않는다(케이스 테스트 실행). 정식 실행은 PC기다림_ms
  기다림ms: number;
  멈췄나: () => boolean;
  // 놓을 때 다시 고른다 — 몇 시간 도는 실행은 잡을 때 받은 대신 PC 가 놓을 때 끝났을 수 있다(주인은 같다)
  토큰: () => Promise<string | undefined>;
  부르기?: typeof fetch;
  쉬기?: (ms: number) => Promise<void>;
}

/**
 * 빈 PC 를 잡아 zip 을 깔고 일을 맡긴 뒤, 일이 어떻게 끝나든 놓는다. 못 잡거나 못 깔면 까닭을 넘긴다 — 던지지 않는다.
 * 놓으면 VISION 이 게임을 끄고 Unity 데이터를 지운다. 깐 빌드는 PC 에 남는다(다음 실행이 덮는다)
 */
export async function PC로<T>(팜: string, zip: string, 설정: PC잡기설정, 일: (pc: 잡은PC) => Promise<T>, 못잡음: (까닭: string) => T | Promise<T>): Promise<T> {
  const 부르기 = 설정.부르기 ?? fetch;
  const 쉬기 = 설정.쉬기 ?? ((ms: number) => new Promise<void>((깨운다) => setTimeout(깨운다, ms)));
  const 처음 = await 설정.토큰();
  const 끝 = Date.now() + 설정.기다림ms;
  let 잡음: { serial: string; 화면: string | undefined };
  for (;;) {
    if (설정.멈췄나()) return 못잡음('멈춘 실행이라 Windows PC 를 잡지 않았습니다');
    let 답: 잡기답;
    try {
      // 120분까지 기다리는 사이 대신 PAT 가 끝날 수 있다 — 잡을 때마다 다시 고른다(주인은 같다)
      답 = await 잡는다(팜, await 설정.토큰().catch(() => 처음), 부르기);
    } catch (err) {
      // ponytail: 답을 못 받은 잡기는 VISION 이 잡았을 수 있어 그 PC 가 120분 묶일 수 있다. 자주 나면 기기 목록에서 내 api 잡기를 찾아 놓는다(VISION 안내서 4절)
      return 못잡음(`Device VISION 에 닿지 못했습니다: ${err instanceof Error ? err.message : String(err)}`);
    }
    if ('잡음' in 답) {
      잡음 = 답.잡음;
      break;
    }
    if (!답.다시 || Date.now() + 다시_잡기_ms > 끝) return 못잡음(답.거절);
    await 쉬기(다시_잡기_ms);
  }
  try {
    const 깔음 = await 깐다(팜, 잡음.serial, zip, await 설정.토큰().catch(() => 처음), 부르기);
    if ('까닭' in 깔음) return 못잡음(깔음.까닭);
    return await 일({ serial: 잡음.serial, 게임: 깔음.게임, 화면: 잡음.화면 });
  } finally {
    await 폰을돌려준다(팜, 잡음.serial, 부르기, await 설정.토큰().catch(() => 처음));
  }
}
