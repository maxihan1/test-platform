// 디바이스 팜에서 빈 폰을 잡아 일을 맡기고 놓는다 — Android 앱 정식 실행과 작성 에이전트의 앱 화면 읽기가 쓴다 (도메인/러너 §5.2 「디바이스 팜 접속 방식」)

// 팜이 받는 가장 짧은 잡기다. 항목 하나의 상한(5분 · DEFAULT_TIMEOUT_MS)보다 넉넉해서 늘리기(/extend)가 필요 없다
const 잡는_분 = 30;
const 팜_제한_ms = 10_000;

export function 팜주소(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.DEVICE_FARM_URL?.replace(/\/+$/, '') || undefined;
}

type 잡음 = { serial: string } | { reason: string };

// 빈 폰(IDLE)만 고른다. 사람이 팜 화면에서 「쓰기」로 잡은 폰도 인증 없는 팜에서는 「내 것」으로 보여,
// 그 폰을 잡았다 놓으면 쓰던 사람이 쫓겨난다
async function 빈폰을잡는다(팜: string, 부르기: typeof fetch): Promise<잡음> {
  const 목록 = await 부르기(`${팜}/api/devices?status=idle`, { signal: AbortSignal.timeout(팜_제한_ms) });
  if (!목록.ok) return { reason: `디바이스 팜이 기기 목록을 주지 않았습니다 (HTTP ${목록.status})` };
  const 몸 = (await 목록.json()) as { value?: { devices?: { serial?: unknown }[] } };
  const serial = (몸.value?.devices ?? []).map((d) => d.serial).find((s): s is string => typeof s === 'string' && s !== '');
  if (serial === undefined) return { reason: '디바이스 팜에 빈 폰이 없습니다' };

  const 잡기 = await 부르기(`${팜}/api/devices/${encodeURIComponent(serial)}/hold`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ minutes: 잡는_분 }),
    signal: AbortSignal.timeout(팜_제한_ms),
  });
  if (!잡기.ok) {
    // 목록을 본 사이에 남이 잡았을 때가 흔하다. 팜의 거절 문장이 까닭을 다 말한다
    const 거절 = ((await 잡기.json().catch(() => null)) as { refused?: unknown } | null)?.refused;
    return { reason: `디바이스 팜이 폰을 내주지 않았습니다: ${typeof 거절 === 'string' ? 거절 : `HTTP ${잡기.status}`}` };
  }
  return { serial };
}

// 놓아야 팜이 깐 앱 · 앱 데이터를 정리한다. 실패해도 던지지 않는다 — 이미 난 판정을 덮지 않고, 잡기는 30분 뒤 팜이 스스로 푼다
async function 폰을돌려준다(팜: string, serial: string, 부르기: typeof fetch): Promise<void> {
  try {
    const res = await 부르기(`${팜}/api/devices/${encodeURIComponent(serial)}/hold`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(팜_제한_ms),
    });
    if (!res.ok) console.error(`[farm] 폰 ${serial} 을 놓지 못했다: HTTP ${res.status}`);
  } catch (err) {
    console.error(`[farm] 폰 ${serial} 을 놓지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** 빈 폰 하나를 잡아 그 번호로 일을 맡기고, 일이 어떻게 끝나든 놓는다. 못 잡으면 까닭을 넘긴다 — 던지지 않는다 */
export async function 팜폰으로<T>(
  팜: string,
  일: (udid: string) => Promise<T>,
  못잡음: (까닭: string) => T,
  부르기: typeof fetch = fetch,
): Promise<T> {
  let 잡은것: 잡음;
  try {
    잡은것 = await 빈폰을잡는다(팜, 부르기);
  } catch (err) {
    return 못잡음(`디바이스 팜에 닿지 못했습니다: ${err instanceof Error ? err.message : String(err)}`);
  }
  if ('reason' in 잡은것) return 못잡음(잡은것.reason);
  try {
    return await 일(잡은것.serial);
  } finally {
    await 폰을돌려준다(팜, 잡은것.serial, 부르기);
  }
}
