// 설정 › BTS 연결의 상태 매핑 고르개에 채울 BTS 상태 · 해결 사유 목록 (도메인/BTS §7 「고를 목록」 · BTS-F3-05)
// 사람이 BTS 상태 키를 손으로 옮겨 적으면 이름과 키를 헷갈린다 — 저장하는 값은 상태는 키, 해결 사유는 이름이다(outbox.ts · close.ts)

import { BTS부르기, type BTS자리, type 부르기함수 } from './client.js';

export interface 고를목록 {
  statuses: { key: string; name: string }[];
  resolutions: { name: string }[];
}

interface 목록몸 {
  data?: { key?: unknown; name?: unknown }[];
}

const 줄들 = (json: unknown): { key: string; name: string }[] =>
  ((json as 목록몸 | null)?.data ?? []).flatMap((d) => (typeof d.key === 'string' && typeof d.name === 'string' ? [{ key: d.key, name: d.name }] : []));

/** 둘 다 로그인만 하면 읽힌다(BTS StatusController · ResolutionController). 하나라도 200 이 아니거나 닿지 않으면 null */
export async function BTS고를목록(자리: BTS자리, 부르기: 부르기함수 = BTS부르기): Promise<고를목록 | null> {
  try {
    const [상태, 해결] = await Promise.all([부르기(자리, 'GET', '/api/v1/statuses'), 부르기(자리, 'GET', '/api/v1/resolutions')]);
    if (상태.status !== 200 || 해결.status !== 200) return null;
    return { statuses: 줄들(상태.json), resolutions: 줄들(해결.json).map(({ name }) => ({ name })) };
  } catch (err) {
    console.error(`[bts] 고를 목록을 못 읽었다: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
