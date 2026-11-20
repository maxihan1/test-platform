// 게임 항목 결과의 곁가지 — 서버 값 대조는 게임 지도 칸에, 부른 API 는 서비스 지도의 케이스 줄에, 지난 함수는 조작 맵 행에 적는다 (도메인/게임 「실행 결과」 · GAME-F1-09 · GAME-F5-06).
// Android 앱 항목도 지난 함수를 앱 조작 맵 줄에 적는다 — 지도 칸은 게임만이다 (도메인/작성 §3.6 「★ 앱 탐색」 결정 10 · APP-F4-09)

import type { ExecuteResponse } from '@platform/kit';

import type { PoolClient } from 'pg';

import { 지도줄들, 케이스지도를넣는다 } from '../prd/apiMap.js';
import { 실행이앱맵을고친다 } from '../prd/appRoute.js';
import { 실행이맵을고친다 } from '../prd/gameRoute.js';
import { 원인을가른다 } from '../reporting/failureType.js';

/**
 * 항목 하나가 조작 맵에 남길 것 — 통과한 항목이면 지난 함수 이름, 조작이 실패한 절차가 있으면 그 동작이 지나던 함수 이름 (도메인/게임 §3.10 「정식 실행이 맵을 고친다」).
 * 조작 실패는 「요소를 찾지 못함」 · 「타임아웃」뿐이다 — 기대값이 다른 실패 · 연결 문제는 길이 틀린 것이 아니라 행을 안 건드린다 (2026-11-20 GAME-F5-06 시작 질문)
 */
export function 맵재료(result: Pick<ExecuteResponse, 'status' | 'steps'>): { 지난: string[]; 실패: string[] } | null {
  const 지난 = result.status === 'PASS' ? [...new Set(result.steps.flatMap((s) => s.gameFns ?? []))] : [];
  const 조작실패 = result.steps.filter((s) => {
    if (s.gameFailedFns === undefined || s.error === undefined) return false;
    const 원인 = 원인을가른다({ status: 'FAIL', assertFailed: false, itemMessage: '', stepMessage: s.error.message });
    return 원인 === 'notFound' || 원인 === 'timeout';
  });
  const 실패 = [...new Set(조작실패.flatMap((s) => s.gameFailedFns ?? []))];
  return 지난.length === 0 && 실패.length === 0 ? null : { 지난, 실패 };
}

/** 맵 고침은 지도 채우기와 따로 되돌린다 — 지도 한 줄이 깨져도 그 실행 몫의 맵 고침은 남고, 맵을 못 고쳐도 판정과 지도는 남는다 */
async function 조작맵을고친다(client: PoolClient, historyId: number, result: ExecuteResponse): Promise<void> {
  const 맵 = 맵재료(result);
  if (맵 === null) return;
  await client.query('SAVEPOINT game_route_result');
  try {
    const 자리 = (
      await client.query<{ service_id: string | null; build_no: string | null; kind: string | null }>(
        'SELECT r.service_id, r.build_no, s.kind FROM run_item i JOIN test_run r ON r.run_id = i.run_id LEFT JOIN service s ON s.id = r.service_id WHERE i.history_id = $1',
        [historyId],
      )
    ).rows[0];
    // Android 앱은 앱 조작 맵(app_route)을 고친다 — 표 · 코드는 게임과 따로다 (도메인/작성 §3.6 「★ 앱 탐색」 결정 6 · 10 · APP-F4-09)
    if (자리?.service_id != null && 자리.kind === 'APP') {
      const 고침 = await 실행이앱맵을고친다(client, Number(자리.service_id), 자리.build_no, 맵.지난, 맵.실패);
      if (고침.빌드적음 + 고침.다시확인 > 0) {
        console.log(`[execution] 항목 ${historyId} — 앱 조작 맵을 고쳤다: 빌드 ${자리.build_no ?? '없음'} 적은 줄 ${고침.빌드적음}개 · 「다시 확인」으로 바꾼 줄 ${고침.다시확인}개`);
      }
    } else if (자리?.service_id != null) {
      const 고침 = await 실행이맵을고친다(client, Number(자리.service_id), 자리.build_no, 맵.지난, 맵.실패);
      if (고침.빌드적음 + 고침.재확인 > 0) {
        console.log(`[execution] 항목 ${historyId} — 조작 맵을 고쳤다: 빌드 ${자리.build_no ?? '없음'} 적은 행 ${고침.빌드적음}개 · 「재확인 필요」로 바꾼 행 ${고침.재확인}개`);
      }
    }
    await client.query('RELEASE SAVEPOINT game_route_result');
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT game_route_result');
    console.error(`[execution] 항목 ${historyId} 의 조작 맵을 못 고쳤다(판정은 남긴다): ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 판정을 넣은 트랜잭션 안에서 부른다. 지도는 힌트라 깨져도 판정은 남긴다 — SAVEPOINT 로 지도만 되돌리고 알린다 (execution/traceIngest.ts 와 같은 꼴).
 * android 게임은 trace 가 없어 서비스 지도의 케이스 줄을 러너가 본 호출(apiCalls)로 채운다
 */
export async function 게임결과를넣는다(client: PoolClient, historyId: number, result: ExecuteResponse): Promise<void> {
  await 조작맵을고친다(client, historyId, result);
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
