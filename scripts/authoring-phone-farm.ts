// 폰 돌려 보기가 디바이스 팜에서 덤 폰을 잡고 놓는다 — 목록 · 조건 잡기 · 놓기 (SPEC 도메인/작성 §3.6 「앱 화면」 「폰 여러 대로 나눠 돌린다」)
// authoring-phone-split 에서 떼어 냈다 — 나누는 규칙(순수 함수)과 팜 부르기를 가른다

import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { 패키지이름인가 } from '@platform/kit/protocol';

// 잡기 주소는 Appium 주소에서 /wd/hub 를 뗀 곳이다(Devicefarm docs/guides/test-platform.md §4 · §11)

export interface 팜 {
  부르기: typeof fetch;
  주소: string;
  토큰?: string | undefined;
}

export interface 팜폰 {
  serial: string;
  state?: string;
  marketName?: string;
  model?: string;
}

async function 팜부르기(팜: 팜, 방법: string, 길: string, 몸?: unknown): Promise<unknown> {
  const res = await 팜.부르기(`${팜.주소}${길}`, {
    method: 방법,
    headers: { ...(팜.토큰 ? { authorization: `Bearer ${팜.토큰}` } : {}), ...(몸 === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(몸 === undefined ? {} : { body: JSON.stringify(몸) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => null);
}

/** 폰 목록 — 못 읽으면 null(나눠 돌리지 않고 잡은 폰 하나로 간다). 스토어 앱이면 그 앱이 남는 폰만 */
export async function 폰목록(팜: 팜, 질의 = ''): Promise<팜폰[] | null> {
  try {
    const v = (await 팜부르기(팜, 'GET', `/api/devices${질의}`)) as { value?: { devices?: 팜폰[] }; devices?: 팜폰[] } | null;
    const 폰들 = v?.value?.devices ?? v?.devices;
    return Array.isArray(폰들) ? 폰들.filter((p) => typeof p.serial === 'string') : null;
  } catch {
    return null;
  }
}

/**
 * 정식 실행에 PC 를 비켜 준 뒤 다시 빌 때까지 기다린다 — 비었으면 참, 한도까지 안 비면 거짓. 사람이 멈추면 바로 참(부르는 쪽이 멈춤을 본다).
 * 놓자마자 다시 잡으면 1분마다 잡아 보는 정식 실행보다 먼저 가져간다 — 처음에는 그보다 길게 쉰다
 */
export async function 빈PC기다리기(
  팜: () => 팜,
  멈추라했다: () => boolean,
  한도_ms = 120 * 60_000,
  쉬기: (ms: number) => Promise<unknown> = (ms) => new Promise((깨운다) => setTimeout(깨운다, ms)),
): Promise<boolean> {
  for (let 지남 = 0, 쉴 = 90_000; 지남 < 한도_ms; 지남 += 쉴, 쉴 = 60_000) {
    await 쉬기(쉴);
    if (멈추라했다()) return true;
    if ((await 폰목록(팜()))?.some((p) => p.serial.startsWith('pc-') && p.state === 'IDLE') === true) return true;
  }
  return false;
}

export const 빈폰질의 = (앱: string | undefined): string => (앱 !== undefined && 패키지이름인가(앱) ? `?app=${encodeURIComponent(앱)}&status=idle` : '?status=idle');

/** 끊긴 폰 — 뽑혔거나 adb 가 답이 없거나 팜이 빼 뒀다. 목록에 없거나 목록을 못 읽었으면 끊겼다고 하지 않는다 */
export const 끊겼나 = (목록: readonly 팜폰[] | null, 폰: string): boolean => ['OFFLINE', 'MAINTENANCE'].includes(목록?.find((p) => p.serial === 폰)?.state ?? '');

/** 사람이 읽을 폰 이름 — 판매명이 먼저 */
export const 폰이름 = (목록: readonly 팜폰[] | null, 폰: string): string => {
  const p = 목록?.find((x) => x.serial === 폰);
  return p?.marketName ?? p?.model ?? 폰;
};

export const 폰번호꼴 = /^[A-Za-z0-9._:-]{1,64}$/;

/**
 * 빈 폰을 `몇` 대까지 잡는다(30분) — 팜의 조건 잡기(`POST /api/devices/acquire`)가 고르고 잡는 것을 한 번에 해 동시에 도는 작성끼리 같은 폰을 두고 다투지 않는다.
 * 잡은 폰마다 `<CLI 폴더>/held-<번호>` 를 남긴다 — 이 명령이 죽어도 에이전트의 잡은폰놓기가 놓는다. 빈 폰이 없다고 하면(409) 거기서 멈춘다.
 * 번호가 폰 번호 꼴이 아니거나 기록을 못 쓰면 바로 놓는다 — 기록 이름 · 놓기가 그 번호를 못 다룬다
 */
export async function 덤폰잡기(팜: 팜, 몇: number, 앱: string | undefined, 폴더: string): Promise<string[]> {
  const 잡은: string[] = [];
  const 조건 = { minutes: 30, ...(앱 !== undefined && 패키지이름인가(앱) ? { app: 앱 } : {}) };
  while (잡은.length < 몇) {
    let 폰: unknown;
    try {
      폰 = ((await 팜부르기(팜, 'POST', '/api/devices/acquire', 조건)) as { held?: { serial?: unknown } } | null)?.held?.serial;
    } catch {
      break;
    }
    if (typeof 폰 !== 'string') break;
    try {
      if (!폰번호꼴.test(폰)) throw new Error('폰 번호 꼴이 아니다');
      writeFileSync(join(폴더, `held-${폰}`), 폰);
      잡은.push(폰);
    } catch {
      await 팜부르기(팜, 'DELETE', `/api/devices/${encodeURIComponent(폰)}/hold`).catch(() => undefined);
      break;
    }
  }
  return 잡은;
}

/** 덤 폰을 놓는다 — 실패해도 던지지 않는다(30분이면 팜이 스스로 푼다) */
export async function 덤폰놓기(팜: 팜, 폰들: readonly string[], 폴더: string): Promise<void> {
  await Promise.all(
    폰들.map(async (폰) => {
      await 팜부르기(팜, 'DELETE', `/api/devices/${encodeURIComponent(폰)}/hold`).catch(() => undefined);
      rmSync(join(폴더, `held-${폰}`), { force: true });
    }),
  );
}
