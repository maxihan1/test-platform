// 결정 진행 본문 읽기 — 고른 것 목록의 모양만 본다. 값이 맞는지는 decisionRun.ts 가 항목과 견준다 (도메인/작성 §7 「결정 목록 통로」 POST)

export interface 받은것 {
  key: string;
  pick: string;
  text?: unknown;
  option?: unknown;
  env?: unknown;
  rows?: unknown;
  /** SCREENS 에서 고른 화면 주소(틀) — 없으면 모두 */
  screens?: unknown;
}

export function 본문읽기(body: unknown): { prdVersion: number; picks: 받은것[] } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { prdVersion, picks } = body as Record<string, unknown>;
  if (typeof prdVersion !== 'number' || !Number.isSafeInteger(prdVersion) || prdVersion < 0) return null;
  if (!Array.isArray(picks) || picks.length === 0 || picks.length > 2000) return null;
  const 읽음: 받은것[] = [];
  for (const p of picks) {
    if (typeof p !== 'object' || p === null) return null;
    const x = p as Record<string, unknown>;
    if (typeof x.key !== 'string' || typeof x.pick !== 'string') return null;
    읽음.push({ key: x.key, pick: x.pick, text: x.text, option: x.option, env: x.env, rows: x.rows, screens: x.screens });
  }
  return { prdVersion, picks: 읽음 };
}
