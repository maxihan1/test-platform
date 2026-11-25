// 호환성 세트 실행 시작 — 「실행」 단추와 정기 실행 회차가 같이 타는 길 (도메인/호환성 §7 「실행」 · 도메인/정기실행 §3.16 「실행 만들기」)

import { 팜주소 } from '../execution/farm.js';
import { DEFAULT_TIMEOUT_MS } from '../execution/location.js';
import { 프로시저못도는러너인가 } from '../execution/runnerAddr.js';
import { db } from '../settings/store.js';
import { 호환성디바이스목록 } from './devices.js';
import { 실행돌리기 } from './runEngine.js';
import { 실행세우기, 호환성실행오류, type 정기회차 } from './runStore.js';
import { type 고른것, 고른케이스, 셈하기, type 후보, 펼치기 } from './select.js';
import { type 세트, 재료읽기 } from './store.js';

/** 자동 선택을 다시 계산해 실행을 세우고 돌린다. 팜에 못 닿으면 'FARM_UNREACHABLE' — 라우트가 502 로 바꾼다 */
export async function 호환성실행시작(
  set: 세트,
  env: string,
  사람: { username: string; displayName: string },
  정기?: 정기회차,
): Promise<number | 'FARM_UNREACHABLE'> {
  // 실행 행을 세우기 전에 거절한다 — 팜이 없으면 모든 상태가 건너뛰기라 실행을 세울 까닭이 없다
  if (팜주소() === undefined) throw new 호환성실행오류('FARM_OFF', 'DEVICE_FARM_URL 이 비어 있습니다');
  const 팜 = await 호환성디바이스목록();
  if (팜 === null) return 'FARM_UNREACHABLE';
  // 사용 중은 기다린다. 등록에서 빠진 디바이스만 있으면 기다려도 안 생긴다 (§7 「실행」)
  const 있음 = (d: { serial: string; model: string }) => 팜.some((x) => x.serial === d.serial || (set.onePerModel && x.model === d.model));
  if (!set.devices.some(있음)) throw new 호환성실행오류('NO_DEVICE', '등록된 디바이스가 하나도 없습니다');
  const 앱 = await (await db()).query<{ prefix: string }>('SELECT prefix FROM service WHERE id = $1', [set.serviceId]);
  const 재 = await 재료읽기(set.serviceId, 앱.rows[0]?.prefix ?? '');
  // 실행할 때마다 다시 계산해 박제한다 (결정 5). 직접 추가가 자동 선택에도 들면 자동 선택 쪽으로 한 번만.
  // 프로시저 안 케이스면 그 프로시저의 케이스가 통째로 든다 — 같은 프로시저를 여럿 더해도 한 번이다 (§3.13 「테스트 프로시저」)
  const 셈 = 셈하기(재.전체, 재.후보들, set.addedCases, 재.fallback);
  const 자동 = new Set(고른케이스(셈.auto));
  const 차례 = (u: 후보[]) => Math.min(...u.map((c) => { const i = set.addedCases.indexOf(c.tcId); return i < 0 ? Infinity : i; }));
  const 단위 = [
    ...펼치기(재.후보들, [...자동]).map((u) => ({ u, picked: 'AUTO' as const })).sort((a, b) => 자동차례(셈.auto, a.u) - 자동차례(셈.auto, b.u)),
    ...펼치기(재.후보들, set.addedCases).filter((u) => !u.some((c) => 자동.has(c.tcId))).sort((a, b) => 차례(a) - 차례(b)).map((u) => ({ u, picked: 'ADDED' as const })),
  ];
  // 못 도는 러너에는 프로시저를 보내지 않는다 — 사람이 누른 실행은 거절하고 정기 실행은 프로시저만 뺀다 (실행 §3.2 「러너 능력」과 같다)
  const 프로시저 = (u: 후보[]) => u[0]?.proc !== undefined;
  let 돌단위 = 단위;
  if (단위.some((x) => 프로시저(x.u)) && (await 프로시저못도는러너인가())) {
    if (정기 === undefined) throw new 호환성실행오류('RUNNER_NO_PROCEDURE', '서버 테스트 실행기가 테스트 프로시저를 실행하지 못하는 버전입니다');
    돌단위 = 단위.filter((x) => !프로시저(x.u));
  }
  if (돌단위.length === 0) throw new 호환성실행오류('NO_CASE', '선택할 케이스가 없습니다');
  const 고른 = 돌단위.flatMap(({ u, picked }) => u.map((c) => ({ tcId: c.tcId, name: c.name, picked, ...(c.proc !== undefined && { procId: c.proc.id }) })));
  const 파일 = await (await db()).query<{ tc_id: string; file_path: string }>('SELECT tc_id, file_path FROM test_case WHERE tc_id = ANY($1::text[])', [
    고른.map((c) => c.tcId),
  ]);
  const 경로 = new Map(파일.rows.map((r) => [r.tc_id, r.file_path]));
  const runId = await 실행세우기(set, env, 사람, 고른.map((c) => ({ ...c, filePath: 경로.get(c.tcId) ?? '', timeoutMs: DEFAULT_TIMEOUT_MS })), 정기);
  실행돌리기(runId);
  return runId;
}

/** 자동 선택 단위의 차례 — 고른 차례 그대로 돈다 */
const 자동차례 = (auto: readonly 고른것[], u: readonly 후보[]) => auto.findIndex((a) => a.tcId === u[0]?.tcId);
