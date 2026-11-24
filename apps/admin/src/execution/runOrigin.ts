// 실행 시작 방식 · 자동 제목 · 「실패 다시」 검사 (SPEC 도메인/실행 §7 `POST /api/runs` 「자동 제목」 · 공통/4-데이터모델 「실행 시작 방식」)

import type { PoolClient } from 'pg';

import type { 케이스종류 } from './runKind.js';

export type 시작방식 = 'MANUAL' | 'SCHEDULED' | 'RERUN' | 'BUILD' | 'SINGLE';

const 종류말: Record<케이스종류, string> = { UI: 'UI', FN: '기능' };

export interface 제목재료 {
  origin: 시작방식;
  rerunOf?: number;
  /** 빌드로 시작한 실행만 — 제목 머리에 빌드 번호와 스모크를 단다 */
  build?: { no: string; stage: 'SMOKE' | 'FULL' };
  /** 정기 실행 세트가 만든 실행만 — 「정기 · 」 뒤에 세트 이름을 끼운다 (도메인/정기실행 §3.16 「실행 만들기」) */
  setName?: string;
  kind: 케이스종류;
  /** 담긴 케이스 — 번호 차례, 겹치지 않게. 프로시저로 펼쳐서 든 케이스는 안 센다 — 고른 것만이다 */
  케이스들: { tcId: string; name: string }[];
  /** 그 종류의 활성 케이스를 전부 담았나 */
  전체: boolean;
  /** 한 건 실행이 프로시저 하나를 돌릴 때만 — 프로시저가 통째로 도니 제목은 케이스가 아니라 프로시저 번호 · 이름이다. 이름은 스냅샷이 비었으면 번호만 쓴다 */
  프로시저?: { id: string; name: string | null };
}

/** 제목은 test_run.title 에 박제한다 — 옛 실행은 그때 제목 그대로라 다시 짓지 않는다 */
export function 자동제목(재료: 제목재료): string {
  const n = 재료.케이스들.length;
  if (재료.origin === 'RERUN') return `RUN ${String(재료.rerunOf)}의 Fail ${String(n)}건 다시`;
  if (재료.origin === 'SINGLE' && 재료.프로시저 !== undefined) return 재료.프로시저.name === null ? 재료.프로시저.id : `${재료.프로시저.id} ${재료.프로시저.name}`;
  const 첫 = 재료.케이스들[0]!;
  // 한 건은 그 종류 케이스가 하나뿐이어도 「전체 1건」이 아니라 번호 + 이름이다 (도메인/실행 §7 「한 건」 줄)
  const 몸 = 재료.전체 && 재료.origin !== 'SINGLE'
    ? `${종류말[재료.kind]} 전체 ${String(n)}건`
    : n === 1
      ? `${첫.tcId} ${첫.name}`
      : `${첫.tcId} 외 ${String(n - 1)}건`;
  if (재료.origin === 'BUILD' && 재료.build !== undefined) return `빌드 ${재료.build.no} · ${재료.build.stage === 'SMOKE' ? '스모크 · ' : ''}${몸}`;
  if (재료.origin !== 'SCHEDULED') return 몸;
  return 재료.setName === undefined ? `정기 · ${몸}` : `정기 · ${재료.setName} · ${몸}`;
}

/** 그 종류의 활성 케이스를 전부 담았고 꺼진 케이스가 섞이지 않았으면 「전체」다 */
export async function 제목을짓는다(
  client: Pick<PoolClient, 'query'>,
  // 한종류 — 「프로시저 작성」을 켠 애플리케이션. 종류가 하나라 「전체」를 UI · 기능으로 가르지 않고 활성 케이스 전부로 본다
  재료: Omit<제목재료, '전체'> & { prefix: string; 한종류?: boolean },
): Promise<string> {
  const r = await client.query<{ 빠진: number; 꺼진: number }>(
    `SELECT count(*) FILTER (WHERE is_active AND NOT (tc_id = ANY($3::text[])))::int AS "빠진",
            count(*) FILTER (WHERE NOT is_active AND tc_id = ANY($3::text[]))::int AS "꺼진"
       FROM test_case
      WHERE tc_id LIKE $1 AND ($4 OR (tc_id ~ '-UI-[0-9]{3}$') = $2)`,
    [`${재료.prefix}-%`, 재료.kind === 'UI', 재료.케이스들.map((c) => c.tcId), 재료.한종류 === true],
  );
  const { prefix: _prefix, 한종류: _한종류, ...나머지 } = 재료;
  return 자동제목({ ...나머지, 전체: r.rows[0]!.빠진 === 0 && r.rows[0]!.꺼진 === 0 });
}

/**
 * 「실패 N건 다시」가 사실일 때만 실행을 만든다 — 제목이 박제되므로 틀린 제목이 남지 않게 만들기 전에 거절한다.
 * 실패 케이스 가운데 몇 건을 빼고 거는 것은 된다. tcIds 는 프로시저로 펼치기 전에 고른 케이스다 — 펼쳐서 든 케이스는 그 실행에서 통과했어도 같이 돈다.
 * 프로시저로 돈 케이스는 판정 없이 미실행(Blocked · 중단 · 시간 초과)으로 끝났어도 받는다 — 앞 케이스에 가려진 케이스를 볼 길이 다시 돌리기뿐이다.
 * 옛 꼴 케이스는 실패한 것만 받는다 (도메인/실행 §3.2 「테스트 프로시저 실행」 「한 건 · 다시 돌리기 · 시험 실행」)
 */
export async function 다시실행사유(
  client: Pick<PoolClient, 'query'>,
  rerunOf: number,
  // 한종류 — 「프로시저 작성」을 켠 애플리케이션. 종류가 하나라 켜기 전에 돈 UI 실행도 다시 돌린다
  이번: { serviceId: string; kind: 케이스종류; tcIds: string[]; 한종류?: boolean },
): Promise<string | null> {
  // 다른 서비스의 실행은 없는 것과 같은 말로 거절한다 — 볼 권한 없는 서비스의 실행 번호가 있는지 새지 않게.
  // 만들기까지 원래 실행이 지워지지 않게 잡아 둔다 — 지워지면 rerun_of 외래 키가 500 으로 깨진다
  const r = await client.query<{ kind: string; status: string; origin: string; failed: string[] }>(
    `SELECT kind, status, origin,
            ARRAY(SELECT DISTINCT i.tc_id FROM run_item i LEFT JOIN run_exec e ON e.exec_id = i.exec_id
                   WHERE i.run_id = $1 AND i.finished_at IS NOT NULL
                     AND (i.status = 'FAIL' OR (i.status = 'NA' AND e.proc_id IS NOT NULL))) AS failed
       FROM test_run WHERE run_id = $1 AND service_id = $2
        FOR SHARE`,
    [rerunOf, 이번.serviceId],
  );
  const 원래 = r.rows[0];
  if (원래 === undefined) return `이 서비스에 실행 ${String(rerunOf)}이 없다`;
  if (원래.kind === 'SCENARIO') return `실행 ${String(rerunOf)}은 시나리오 실행이다`;
  // 한 건 실행은 실행으로 서지 않는 기록이다 — 거기에 붙이면 어느 실행 결과도 안 고친다 (도메인/실행 §3.2)
  if (원래.origin === 'SINGLE') return `실행 ${String(rerunOf)}은 한 건 실행이다`;
  if (원래.kind !== 이번.kind && !(이번.한종류 === true && 원래.kind === 'UI')) return `실행 ${String(rerunOf)}은 다른 종류의 실행이다`;
  if (원래.status === 'RUNNING') return `실행 ${String(rerunOf)}은 아직 도는 중이다`;
  // 준비 실패 실행은 하나도 안 돌았다 — 프로시저 줄이 미실행이어도 「실패 다시」가 아니다(결과 화면도 항목을 안 그린다)
  if (원래.status === 'PREP_FAILED') return `실행 ${String(rerunOf)}은 준비 실패로 돌지 않았다`;
  const 실패 = new Set(원래.failed);
  const 아닌것 = 이번.tcIds.filter((t) => !실패.has(t));
  if (아닌것.length > 0) return `실행 ${String(rerunOf)}에서 실패하지 않은 케이스가 있다: ${아닌것.join(', ')}`;
  return null;
}

const 주소값: Record<string, 시작방식> = { manual: 'MANUAL', scheduled: 'SCHEDULED', rerun: 'RERUN', build: 'BUILD' };

/** 실행 목록의 `?origin=&days=`. 모르는 값 · 범위 밖은 state 처럼 조용히 버린다 — 거르개는 권한이 아니다 (SPEC 실행 §7) */
export function 시작방식거르개(origin: string | undefined, days: string | undefined): { origin?: 시작방식; days?: number } {
  const 방식 = origin !== undefined && Object.hasOwn(주소값, origin) ? 주소값[origin] : undefined;
  const 일 = days !== undefined && /^\d{1,3}$/.test(days) ? Number(days) : 0;
  return { ...(방식 === undefined ? {} : { origin: 방식 }), ...(일 >= 1 && 일 <= 366 ? { days: 일 } : {}) };
}
