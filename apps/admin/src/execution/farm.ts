// 디바이스 팜에서 빈 폰을 잡아 일을 맡기고 놓는다 — Android 앱 정식 실행 · 실제 폰 모바일 웹 · 작성 에이전트의 앱 화면 읽기가 쓴다 (도메인/러너 §5.2 「디바이스 팜 접속 방식」)

// 팜이 받는 가장 짧은 잡기다. 항목 하나의 상한(5분 · DEFAULT_TIMEOUT_MS)보다 넉넉해서 앱 항목은 늘리기(/extend)가 필요 없다
const 잡는_분 = 30;
const 팜_제한_ms = 10_000;
// 놓은 폰은 팜이 정리하는 동안(실측 1초 안팎) 빈 폰이 아니다. 앞 항목이 막 놓은 폰을 다음 항목이 못 잡고 NA 가 되지 않게 그동안만 기다린다
const 정리_기다림_ms = 20_000;
const 다시_볼_ms = 1_000;

export function 팜주소(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.DEVICE_FARM_URL?.replace(/\/+$/, '') || undefined;
}

// 인증 켠 팜은 모든 요청에 토큰을 받는다. 누른 사람 토큰을 받았으면 그것, 아니면 서버 몫이다 (도메인/러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
export function 팜머리(env: Record<string, string | undefined> = process.env, 사람토큰?: string): Record<string, string> {
  const 토큰 = 사람토큰 ?? env.DEVICE_FARM_TOKEN ?? '';
  return 토큰 === '' ? {} : { authorization: `Bearer ${토큰}` };
}

type 기기 = { serial?: unknown; state?: unknown; detail?: unknown };
type 고름 = { serial: string } | { reason: string };

// 빈 폰(IDLE)만 고른다. 사람이 팜 화면에서 「쓰기」로 잡은 폰도 인증 없는 팜에서는 「내 것」으로 보여,
// 그 폰을 잡았다 놓으면 쓰던 사람이 쫓겨난다
async function 빈폰을고른다(팜: string, 부르기: typeof fetch, 쉬기: (ms: number) => Promise<void>, 토큰: string | undefined): Promise<고름> {
  const 끝 = Date.now() + 정리_기다림_ms;
  for (;;) {
    const 목록 = await 부르기(`${팜}/api/devices`, { headers: 팜머리(process.env, 토큰), signal: AbortSignal.timeout(팜_제한_ms) });
    // 인증 켠 팜은 토큰이 없거나 틀리면 401 이다 — 주소나 팜을 의심하기 전에 토큰을 보게 한다. 누른 사람 토큰이면 Auth 에서 폐기했거나 기간이 끝났다
    const 볼곳 = 토큰 === undefined ? 'DEVICE_FARM_TOKEN 을' : '내 메뉴의 통합계정 토큰을';
    if (!목록.ok) return { reason: `Device VISION 이 기기 목록을 주지 않았습니다 (HTTP ${목록.status})${목록.status === 401 ? ` — ${볼곳} 확인하세요` : ''}` };
    // 주소가 틀려 다른 쪽이 200 으로 HTML 을 주면 「닿지 못했다」가 아니라 이 말이어야 주소를 다시 본다
    const 몸 = (await 목록.json().catch(() => null)) as { value?: { devices?: 기기[] } } | null;
    if (몸 === null) return { reason: 'Device VISION 의 기기 목록을 읽지 못했습니다 — DEVICE_FARM_URL 을 확인하세요' };
    const 기기들 = 몸.value?.devices ?? [];
    const 빈폰 = 기기들.find((d) => d.state === 'IDLE' && typeof d.serial === 'string' && d.serial !== '');
    if (빈폰 !== undefined) return { serial: 빈폰.serial as string };
    if (!기기들.some((d) => d.detail === 'cleaning') || Date.now() >= 끝) return { reason: 'Device VISION 에 빈 폰이 없습니다' };
    await 쉬기(다시_볼_ms);
  }
}

// 화면이 새 탭으로 여는 링크다 — javascript: · file: 같은 주소는 안 넘긴다
function 웹주소(값: unknown): string | undefined {
  if (typeof 값 !== 'string') return undefined;
  try {
    const { protocol } = new URL(값);
    return protocol === 'http:' || protocol === 'https:' ? 값 : undefined;
  } catch {
    return undefined;
  }
}

// 거절이면 그 문장, 잡았으면 그 폰 화면 보기 링크(held.screen — 옛 팜은 없다). 닿지 못하면 던진다
async function 잡는다(팜: string, serial: string, 부르기: typeof fetch, 분: number, 토큰: string | undefined): Promise<{ 거절: string } | { 화면: string | undefined }> {
  const 잡기 = await 부르기(`${팜}/api/devices/${encodeURIComponent(serial)}/hold`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...팜머리(process.env, 토큰) },
    body: JSON.stringify({ minutes: 분 }),
    signal: AbortSignal.timeout(팜_제한_ms),
  });
  const 몸 = (await 잡기.json().catch(() => null)) as { refused?: unknown; held?: { screen?: unknown } } | null;
  if (잡기.ok) return { 화면: 웹주소(몸?.held?.screen) };
  // 목록을 본 사이에 남이 잡았을 때가 흔하다. 팜의 거절 문장이 까닭을 다 말한다
  return { 거절: `Device VISION 이 폰을 내주지 않았습니다: ${typeof 몸?.refused === 'string' ? 몸.refused : `HTTP ${잡기.status}`}` };
}

// 놓아야 팜이 깐 앱 · 앱 데이터를 정리한다. 실패해도 던지지 않는다 — 이미 난 판정을 덮지 않고, 잡기는 30분 뒤 팜이 스스로 푼다
async function 폰을돌려준다(팜: string, serial: string, 부르기: typeof fetch, 토큰: string | undefined): Promise<void> {
  try {
    const res = await 부르기(`${팜}/api/devices/${encodeURIComponent(serial)}/hold`, {
      method: 'DELETE',
      headers: 팜머리(process.env, 토큰),
      signal: AbortSignal.timeout(팜_제한_ms),
    });
    if (!res.ok) console.error(`[farm] 폰 ${serial} 을 놓지 못했다: HTTP ${res.status}`);
  } catch (err) {
    console.error(`[farm] 폰 ${serial} 을 놓지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 긴 실행(게임)이 잡기를 30분 더 늘린다. 끝나기 10분 전이 아니면 팜이 409 로 거절하는데 그건 정상이라 조용히 넘긴다.
 * 그 밖의 실패도 던지지 않는다 — 늘리지 못해도 지금 항목은 돌고, 정말 끊기면 항목이 NA 로 닫힌다
 */
export async function 잡기를늘린다(팜: string, serial: string, 부르기: typeof fetch = fetch, 토큰?: string): Promise<void> {
  try {
    const res = await 부르기(`${팜}/api/devices/${encodeURIComponent(serial)}/hold/extend`, {
      method: 'POST',
      headers: 팜머리(process.env, 토큰),
      signal: AbortSignal.timeout(팜_제한_ms),
    });
    if (!res.ok && res.status !== 409) console.error(`[farm] 폰 ${serial} 잡기를 늘리지 못했다: HTTP ${res.status}`);
  } catch (err) {
    console.error(`[farm] 폰 ${serial} 잡기를 늘리지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const 닿지못함 = (err: unknown): string => `Device VISION 에 닿지 못했습니다: ${err instanceof Error ? err.message : String(err)}`;

/**
 * 빈 폰 하나를 잡아 그 번호로 일을 맡기고, 일이 어떻게 끝나든 놓는다. 못 잡으면 까닭을 넘긴다 — 던지지 않는다. 분은 팜이 받는 30 · 60 · 120.
 * 토큰은 누른 사람 것이다. 없으면 서버 몫 — 고르기 · 잡기 · 놓기가 같은 토큰이어야 팜이 받는다.
 * 일에 그 폰 화면 보기 링크도 넘긴다 — 테스트 모드가 누른 사람에게 새 탭으로 건넨다 (도메인/실행 §3.2 「테스트 모드」 「VISION 링크」)
 */
export async function 팜폰으로<T>(
  팜: string,
  일: (udid: string, 화면: string | undefined) => Promise<T>,
  못잡음: (까닭: string) => T,
  부르기: typeof fetch = fetch,
  쉬기: (ms: number) => Promise<void> = (ms) => new Promise((깨운다) => setTimeout(깨운다, ms)),
  분: number = 잡는_분,
  토큰?: string,
): Promise<T> {
  let serial: string;
  try {
    const 고른것 = await 빈폰을고른다(팜, 부르기, 쉬기, 토큰);
    if ('reason' in 고른것) return 못잡음(고른것.reason);
    serial = 고른것.serial;
  } catch (err) {
    return 못잡음(닿지못함(err));
  }
  let 화면: string | undefined;
  try {
    const 잡음 = await 잡는다(팜, serial, 부르기, 분, 토큰);
    if ('거절' in 잡음) return 못잡음(잡음.거절);
    화면 = 잡음.화면;
  } catch (err) {
    // 답이 늦게 왔을 뿐 팜은 잡았을 수 있다. 안 놓으면 그 폰이 30분 동안 빈 폰이 아니다
    await 폰을돌려준다(팜, serial, 부르기, 토큰);
    return 못잡음(닿지못함(err));
  }
  try {
    return await 일(serial, 화면);
  } finally {
    await 폰을돌려준다(팜, serial, 부르기, 토큰);
  }
}

// VISION 이 Chrome 데이터를 지우고 켠 뒤 DevTools 가 열릴 때까지 15초를 기다린다 — 그보다 넉넉히
const Chrome_제한_ms = 40_000;

/** 러너가 실제 폰 Chrome 에 붙을 칸 (러너 §5.2 「모바일 웹 — 실제 폰 Chrome」) */
export interface 폰Chrome칸 {
  udid: string;
  cdpUrl: string;
  farmToken?: string;
}

// 잡은 폰의 Chrome 을 깨끗이 켜고 DevTools 연결 주소를 받는다. 거절 · 못 닿음은 까닭 문장이다 (VISION 안내서 13절)
async function Chrome을켠다(팜: string, serial: string, 부르기: typeof fetch, 토큰: string | undefined): Promise<{ cdpUrl: string } | { 까닭: string }> {
  try {
    const res = await 부르기(`${팜}/api/devices/${encodeURIComponent(serial)}/chrome`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...팜머리(process.env, 토큰) },
      body: '{}',
      signal: AbortSignal.timeout(Chrome_제한_ms),
    });
    const 값 = ((await res.json().catch(() => null)) as { value?: { cdpUrl?: unknown; message?: unknown } } | null)?.value;
    if (!res.ok) return { 까닭: `Device VISION 이 폰 Chrome 을 켜지 못했습니다: ${typeof 값?.message === 'string' ? 값.message : `HTTP ${res.status}`}` };
    // 러너 입구도 ws(s) 만 받는다 — 여기서 걸러야 까닭이 VISION 쪽으로 남는다
    if (typeof 값?.cdpUrl !== 'string' || !/^wss?:\/\//.test(값.cdpUrl)) return { 까닭: 'Device VISION 이 폰 Chrome 연결 주소를 주지 않았습니다' };
    return { cdpUrl: 값.cdpUrl };
  } catch (err) {
    return { 까닭: 닿지못함(err) };
  }
}

/**
 * 모바일 웹을 실제 폰 Chrome 에서 — 빈 폰을 잡아 그 폰 Chrome 을 켜고 러너가 붙을 칸을 일에 넘긴 뒤 놓는다.
 * 디바이스 줄은 안 쓴다 — 폰 다툼은 팜의 잡기가 가른다 (도메인/실행 §3.2 「모바일 웹 실행 위치」).
 * 잡은 토큰은 서버 몫이어도 늘 farmToken 으로 싣는다 — 러너는 자기 토큰을 같은 팜 호스트에만 싣는다 (러너 §5.2)
 */
export function 폰Chrome으로<T>(
  팜: string,
  일: (칸: 폰Chrome칸, 화면: string | undefined) => Promise<T>,
  못잡음: (까닭: string) => T,
  토큰?: string,
  분?: number,
  부르기: typeof fetch = fetch,
): Promise<T> {
  const farmToken = 토큰 ?? (process.env.DEVICE_FARM_TOKEN || undefined);
  return 팜폰으로(
    팜,
    async (udid, 화면) => {
      const 켬 = await Chrome을켠다(팜, udid, 부르기, 토큰);
      return '까닭' in 켬 ? 못잡음(켬.까닭) : 일({ udid, cdpUrl: 켬.cdpUrl, ...(farmToken !== undefined && { farmToken }) }, 화면);
    },
    못잡음,
    부르기,
    undefined,
    분,
    토큰,
  );
}
