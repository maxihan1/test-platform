// 정기 실행 회차의 줄 하나로 실행 하나를 만든다 — 기능 · UI · E2E · 호환성 (도메인/정기실행 §3.16 「실행 만들기」)

import { listCases } from '../catalog/store.js';
import { tcId종류 } from '../catalog/rules.js';
import { 호환성실행시작 } from '../compat/runStart.js';
import { 호환성실행오류 } from '../compat/runStore.js';
import { 세트하나 } from '../compat/store.js';
import { dispatch } from '../execution/dispatcher.js';
import { 앱케이스를뺀다 } from '../execution/location.js';
import { createRun, MAX_ITEMS, RunInputError } from '../execution/store.js';
import { 시나리오분배 } from '../scenario/runResult.js';
import { 시나리오실행오류, 실행만들기 } from '../scenario/runStore.js';
import { 빠진까닭, 줄앱, type 서버고름, type 재료, type 줄 } from './check.js';

// 사람이 아니므로 사람 이름을 받지 않는다. 이름 칸도 박는다 — 비우면 「실행자 미상」으로 읽힌다 (실행 §8.6)
const 스케줄러 = { username: '스케줄러', displayName: '스케줄러' };

export interface 회차정보 {
  occurrenceId: number;
  setName: string;
  base: boolean;
}

/** 실행을 만들었으면 번호, 못 만들었으면 회차 notes 에 남길 까닭 */
export type 줄결과 = { runId: number } | { reason: string };

const 글 = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** 기능 · UI — 「전체」는 지금의 활성 케이스 전부, 직접 고르기는 고른 번호 중 살아 있는 것 */
async function 케이스실행(x: 줄, prefix: string, env: string, 회차: 회차정보, 로그: (말: string) => void): Promise<줄결과> {
  const 목록 = await listCases({ service: prefix, q: '', activeOnly: true, page: 1, pageSize: MAX_ITEMS });
  const 고른 = x.tcIds === null ? null : new Set(x.tcIds);
  const 담을 = 목록.items.filter((c) => tcId종류(c.tcId) === x.kind && (고른 === null || 고른.has(c.tcId)));
  // 팜이 없으면 앱 케이스를 돌릴 곳이 없다 (공통/6-인프라 §9.2)
  const { 남은 } = 앱케이스를뺀다(담을, process.env);
  if (남은.length === 0) return { reason: 'NO_CASE' };
  const { runId, items } = await createRun({
    origin: 'SCHEDULED',
    triggeredBy: 스케줄러.username,
    triggeredByName: 스케줄러.displayName,
    env,
    // 반복은 테스트 코드를 검증하는 도구지 추이를 만드는 도구가 아니다 (실행 §8.2)
    repeat: 1,
    // 새벽에 도는 것을 볼 사람이 없다. 아침에 Slack 에서 보는 것이 유일한 경로다 (실행 §8.9)
    notifySlack: true,
    sched: 회차,
    // 빈 칸으로 보낸다. createRun 이 저장값 → 케이스 코드 기본값 순서로 채운다
    items: 남은.map((c) => ({ tcId: c.tcId, platforms: c.platforms, params: {}, expected: {} })),
  });
  void dispatch(runId, items).catch((err: unknown) => 로그(`[sched] 실행 ${String(runId)} 분배가 깨졌다: ${글(err)}`));
  return { runId };
}

/**
 * 줄 하나를 돌린다. 빠지는 줄은 까닭 코드(§7 세트줄 skipped), 만들다 거절당하면 그 오류 문구를 돌려준다 — 회차는 다음 줄로 간다.
 * 거절이 아닌 오류(DB 끊김 등)는 던진다 — 부르는 쪽이 이번 점검을 접고 다음 점검에 같은 줄을 다시 본다
 */
export async function 줄돌리기(x: 줄, 고름: 서버고름, 재: 재료, 회차: 회차정보, 로그: (말: string) => void): Promise<줄결과> {
  const 까닭 = 빠진까닭(x, 고름, 재);
  if (까닭 !== null) return { reason: 까닭 };
  const 앱 = 줄앱(x, 재)!;
  const env = 고름.get(앱.id)!;
  const 정기 = { occurrenceId: 회차.occurrenceId, setName: 회차.setName };
  try {
    if (x.kind === 'FN' || x.kind === 'UI') return await 케이스실행(x, 앱.prefix, env, 회차, 로그);
    if (x.kind === 'E2E') {
      // 고르개가 없는 시작이라 모바일 웹 단계는 서버 흉내다 (실행 §8.2 「모바일 웹 실행 위치」)
      const { runId, 요청, 폰 } = await 실행만들기(x.scenarioId!, env, 스케줄러, 'server', 정기);
      void 시나리오분배(runId, 요청, 폰).catch((err: unknown) => 로그(`[sched] 실행 ${String(runId)} 분배가 깨졌다: ${글(err)}`));
      return { runId };
    }
    const set = await 세트하나(x.compatSetId!);
    if (set === null || !set.isActive) return { reason: 'COMPAT_SET_ARCHIVED' };
    const runId = await 호환성실행시작(set, env, 스케줄러, 정기);
    return runId === 'FARM_UNREACHABLE' ? { reason: 'FARM_UNREACHABLE' } : { runId };
  } catch (err) {
    if (err instanceof RunInputError) return { reason: `${err.code}: ${err.message}` };
    if (err instanceof 시나리오실행오류 || err instanceof 호환성실행오류) return { reason: `${err.code}: ${err.message}` };
    throw err;
  }
}
