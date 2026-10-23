// 게임 항목 결과의 곁가지 — 서버 값 대조는 게임 지도 칸에, 부른 API 는 서비스 지도의 케이스 줄에 적는다 (도메인/게임 「실행 결과」 · GAME-F1-09)

import type { ExecuteResponse } from '@platform/kit';

import type { PoolClient } from 'pg';

import { 지도줄들, 케이스지도를넣는다 } from '../prd/apiMap.js';

/**
 * 판정을 넣은 트랜잭션 안에서 부른다. 지도는 힌트라 깨져도 판정은 남긴다 — SAVEPOINT 로 지도만 되돌리고 알린다 (execution/traceIngest.ts 와 같은 꼴).
 * android 게임은 trace 가 없어 서비스 지도의 케이스 줄을 러너가 본 호출(apiCalls)로 채운다
 */
export async function 게임결과를넣는다(client: PoolClient, historyId: number, result: ExecuteResponse): Promise<void> {
  if (result.elementChecks === undefined && result.apiCalls === undefined) return;
  await client.query('SAVEPOINT game_result');
  try {
    const 자리 = (
      await client.query<{ run_id: string; tc_id: string; service_id: string | null; base_url: string | null }>(
        'SELECT i.run_id, i.tc_id, r.service_id, r.base_url FROM run_item i JOIN test_run r ON r.run_id = i.run_id WHERE i.history_id = $1',
        [historyId],
      )
    ).rows[0];
    // 서비스 통합 전 실행은 서비스가 없어 지도를 안 채운다
    if (자리?.service_id != null && 자리.base_url != null) {
      const [서비스, runId] = [Number(자리.service_id), Number(자리.run_id)];
      // 같은 열쇠를 두 번 대조했으면 마지막 것이 남는다
      const 대조들 = [...new Map((result.elementChecks ?? []).map((c) => [c.key, { key: c.key, value: c.serverValue ?? null }])).values()];
      if (대조들.length > 0) {
        await client.query(
          `UPDATE game_element g SET server_value = x.value, checked_run = $3, updated_at = now()
             FROM jsonb_to_recordset($2::jsonb) AS x(key text, value jsonb)
            WHERE g.service_id = $1 AND g.key = x.key`,
          [서비스, JSON.stringify(대조들), runId],
        );
      }
      // 미실행은 어디까지 불렀는지 몰라 그대로 둔다(finishItem 의 api_call_seen 과 같다).
      // 더 새 실행이 이미 이 케이스 줄을 썼으면 낡은 것이라 안 넣는다 — 게임은 trace 가 없어 케이스지도를넣는다 의 run_trace 확인이 안 걸린다
      const 안넣음 =
        result.status === 'NA' ||
        (
          await client.query('SELECT 1 FROM service_api_use WHERE service_id = $1 AND tc_id = $2 AND run_id > $3 LIMIT 1', [서비스, 자리.tc_id, runId])
        ).rowCount !== 0;
      if (result.apiCalls !== undefined && !안넣음) {
        const 줄들 = 지도줄들(
          result.apiCalls.map((c) => ({ method: c.method, url: new URL(c.path, 자리.base_url!).href, resourceType: 'api', status: c.status })),
          자리.base_url,
        );
        await 케이스지도를넣는다(client, 서비스, 자리.tc_id, runId, 줄들);
      }
    }
    await client.query('RELEASE SAVEPOINT game_result');
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT game_result');
    console.error(`[execution] 항목 ${historyId} 의 게임 지도를 못 채웠다(판정은 남긴다): ${err instanceof Error ? err.message : String(err)}`);
  }
}
