// 호환성 세트 실행 시작 — 「실행」 단추와 정기 실행 회차가 같이 타는 길 (도메인/호환성 §7 「실행」 · 도메인/정기실행 §3.16 「실행 만들기」)

import { 팜주소 } from '../execution/farm.js';
import { DEFAULT_TIMEOUT_MS } from '../execution/location.js';
import { db } from '../settings/store.js';
import { 호환성디바이스목록 } from './devices.js';
import { 실행돌리기 } from './runEngine.js';
import { 실행세우기, 호환성실행오류, type 정기회차 } from './runStore.js';
import { 셈하기 } from './select.js';
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
  // 실행할 때마다 다시 계산해 박제한다 (결정 5). 직접 추가가 자동 선택에도 들면 자동 선택 쪽으로 한 번만
  const 셈 = 셈하기(재.전체, 재.후보들, set.addedCases, 재.fallback);
  const 자동 = new Set(셈.auto.map((a) => a.tcId));
  const 후보 = new Map(재.후보들.map((c) => [c.tcId, c]));
  const 고른 = [...자동, ...set.addedCases.filter((t) => !자동.has(t))].flatMap((t) => {
    const c = 후보.get(t);
    return c === undefined ? [] : [{ tcId: t, name: c.name, picked: 자동.has(t) ? ('AUTO' as const) : ('ADDED' as const) }];
  });
  if (고른.length === 0) throw new 호환성실행오류('NO_CASE', '고를 케이스가 없습니다');
  const 파일 = await (await db()).query<{ tc_id: string; file_path: string }>('SELECT tc_id, file_path FROM test_case WHERE tc_id = ANY($1::text[])', [
    고른.map((c) => c.tcId),
  ]);
  const 경로 = new Map(파일.rows.map((r) => [r.tc_id, r.file_path]));
  const runId = await 실행세우기(set, env, 사람, 고른.map((c) => ({ ...c, filePath: 경로.get(c.tcId) ?? '', timeoutMs: DEFAULT_TIMEOUT_MS })), 정기);
  실행돌리기(runId);
  return runId;
}
