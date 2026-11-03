// 실행 칸이 trial 인 사람의 시험 실행 조립을 거른다 — API 호출 · 모킹 단계는 저장된 시나리오에 똑같이 든 것만 (SPEC 도메인/인증 §3.5 「테스트 모드」)
// 모킹 본문은 서버 러너 브라우저에서 아무 코드나 돌려 내부망을 실시간 칸에 띄울 수 있고, API 단계는 앞 케이스의 로그인 쿠키를 들고 나간다.
// 저장된 시나리오의 단계는 실행 write 인 사람이 만든 것이라 그대로 둔다

import type { ScenarioPart } from '@platform/kit';
import type { Pool } from 'pg';

const 이름 = { api: 'API 호출', mock: '모킹' } as const;

/** 저장된 시나리오에 없는 API 호출 · 모킹 단계의 사유. 다 있으면 null */
export async function 저장안된단계(pool: Pool, service: string, parts: readonly ScenarioPart[]): Promise<string | null> {
  const 볼것 = parts.flatMap((p, i) => (p.kind === 'api' || p.kind === 'mock' ? [{ seq: i + 1, kind: p.kind, p }] : []));
  if (볼것.length === 0) return null;
  // jsonb 같음은 칸 차례를 안 따진다. 치운 시나리오는 뺀다 — 그 단계를 왜 치웠는지 모른다
  const r = await pool.query<{ n: string }>(
    `SELECT x.n FROM jsonb_array_elements($2::jsonb) WITH ORDINALITY AS x(part, n)
     WHERE NOT EXISTS (
       SELECT 1 FROM scenario s
       JOIN service sv ON sv.id = s.service_id
       JOIN scenario_version v ON v.scenario_id = s.id
       CROSS JOIN LATERAL jsonb_array_elements(v.parts) AS e(part)
       WHERE sv.prefix = $1 AND s.is_active AND e.part = x.part)
     ORDER BY x.n`,
    [service, JSON.stringify(볼것.map((x) => x.p))],
  );
  if (r.rows.length === 0) return null;
  const 걸린 = r.rows.map((row) => 볼것[Number(row.n) - 1]!).map((x) => `${x.seq}번 단계(${이름[x.kind]})`);
  return `${걸린.join(' · ')}는 저장된 시나리오에 있는 것만 시험 실행할 수 있습니다`;
}
