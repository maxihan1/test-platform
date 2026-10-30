// 실행 결과 화면의 실패 케이스 카드 질의 — 실패 · 변화 · 최근 흐름 · 처음 실패한 회차의 항목 상세 (도메인/리포팅 §7)

import type { DeviceInfo, ElementCheck, ItemStatus, Platform } from '@platform/kit';

import { 팜증적목록, type 팜파일 } from '../execution/farmEvidence.js';
import { findItem } from '../execution/queries.js';
import { 최근몇건 } from '../execution/history.js';
import type { RunItemDetail } from '../execution/runTypes.js';
import { 다시실행칸들, 다시실행칸으로, 지금항목, type 다시실행원재료, type 다시실행칸 } from '../execution/single.js';
import { 스모크건너뛰기식, 판정접기식 } from './dashboardSql.js';
import { 연속실패수, 쪽을자른다, 케이스로묶는다, type 실패행, type 실패디바이스, type 카드변화 } from './failuresShape.js';
import { 카드요구들, 판정들, type 카드요구, type 판정 } from './failReqs.js';
import { compareWithPrevious, db } from './insights.js';

export interface FailureDevice extends Omit<실패디바이스, 'firstFailedHistoryId'> {
  streak: number | null;
  recent: ItemStatus[];
  item: RunItemDetail;
  /** 러너가 받아 둔 팜 화면 영상 · logcat — 앱 항목이 통과하지 못했을 때만 있다 (도메인/러너 §5.2) */
  farm: 팜파일[];
  /** 한 건 실행이 덮은 디바이스면 그 한 건 · 원래 결과 (도메인/실행 §7 `GET /api/runs/:runId` items[].rerun) */
  rerun: 다시실행칸 | null;
  /** 그 회차를 돌린 폰과 앱의 판 — android 만 있다. 증거 칸 「기기 정보」 탭이 읽는다 (리포팅 §7) */
  device: DeviceInfo | null;
  /** 그 회차가 데이터 대조로 읽은 게임 서버 값 — 게임 항목만 차고 나머지는 빈 목록이다. 증거 칸 「오브젝트」 탭이 읽는다 (리포팅 §7) */
  elementChecks: ElementCheck[];
}

export interface FailureCase {
  tcId: string;
  tcName: string;
  devices: FailureDevice[];
  /** 지도 ① 로 덮는 요구 — 지금 판 기준이라 실행 때 박제하지 않는다 */
  reqs: 카드요구[];
  judgment: 판정;
}

export interface FailureCards {
  items: FailureCase[];
  total: number;
  page: number;
  pageSize: number;
}

// 같은 서비스 · env · 종류의 끝난 실행을 이번 실행까지 모아 실행마다 회차를 접고, 쌍마다 새 것부터 최근몇건만 남긴다.
// 앞 실행은 insights 의 직전 실행처럼 started_at 이 더 이른 것만이다 — 시각이 같은 실행이 끼면 streak 이 계속깨짐을 정한 실행과 어긋난다.
// 스모크 아닌 실행은 스모크도 건너뛴다 — 같은 까닭이다(dashboardSql.ts 스모크건너뛰기식)
const 최근흐름SQL = `
  SELECT x.tc_id, x.platform, x.verdict
  FROM (
    SELECT i.tc_id, i.platform, ${판정접기식} AS verdict,
           ROW_NUMBER() OVER (PARTITION BY i.tc_id, i.platform ORDER BY r.started_at DESC, r.run_id DESC) AS n
    FROM test_run t
    JOIN test_run r ON r.service_id = t.service_id AND r.env = t.env AND r.kind = t.kind
                   AND r.status <> 'RUNNING' AND (r.run_id = t.run_id OR (r.started_at < t.started_at AND ${스모크건너뛰기식('r', 't')}))
    JOIN LATERAL ${지금항목('o.run_id = r.run_id')} i ON true
    WHERE t.run_id = $1
      AND (i.tc_id, i.platform) IN (SELECT * FROM unnest($2::text[], $3::text[]))
    GROUP BY r.run_id, r.started_at, i.tc_id, i.platform
  ) x
  WHERE x.n <= $4
  ORDER BY x.tc_id, x.platform, x.n`;

// 지금 결과다 — 다시 돌려 통과한 케이스는 카드가 되지 않는다 (도메인/실행 §3.2)
const 실패행들SQL = `
  SELECT i.history_id, i.tc_id, i.tc_name, i.platform, i.attempt, i.status, ${다시실행칸들}
  FROM ${지금항목('o.run_id = $1')} i`;

export async function 실패카드(runId: number, page: number, platform?: Platform): Promise<FailureCards> {
  const pool = await db();
  const 비교 = await compareWithPrevious(runId);
  const 변화표 = new Map<string, 카드변화>();
  for (const c of 비교.케이스들) {
    if (c.판정 === '새로깨짐' || c.판정 === '계속깨짐') 변화표.set(`${c.tcId}|${c.platform}`, c.판정);
  }

  const 행들 = await pool.query<{
    history_id: string;
    tc_id: string;
    tc_name: string;
    platform: Platform;
    attempt: number;
    status: ItemStatus;
  } & 다시실행원재료>(실패행들SQL, [runId]);
  // 덮인 항목은 한 건 실행의 것이라 상세 · 팜 증적을 그 실행 번호로 읽는다
  const 다시실행들 = new Map(행들.rows.map((r) => [Number(r.history_id), 다시실행칸으로(r)]));
  const 모양: 실패행[] = 행들.rows.map((r) => ({
    historyId: Number(r.history_id),
    tcId: r.tc_id,
    tcName: r.tc_name,
    platform: r.platform,
    attempt: r.attempt,
    status: r.status,
  }));

  const 쪽 = 쪽을자른다(케이스로묶는다(모양, 변화표, platform), page);
  const 쌍들 = 쪽.items.flatMap((c) => c.devices.map((d) => ({ tcId: c.tcId, platform: d.platform })));

  const 흐름 = new Map<string, ItemStatus[]>();
  if (쌍들.length > 0) {
    const { rows } = await pool.query<{ tc_id: string; platform: string; verdict: ItemStatus }>(최근흐름SQL, [
      runId,
      쌍들.map((q) => q.tcId),
      쌍들.map((q) => q.platform),
      최근몇건,
    ]);
    for (const r of rows) {
      const 키 = `${r.tc_id}|${r.platform}`;
      흐름.set(키, [...(흐름.get(키) ?? []), r.verdict]);
    }
  }

  const tcIds = 쪽.items.map((c) => c.tcId);
  const [요구표, 판정표] = await Promise.all([카드요구들(runId, tcIds), 판정들(runId, tcIds)]);

  // 폰 · 앱 판과 게임 요소 대조는 쪽의 회차를 한 번에 읽는다 — history_id 는 실행을 넘어 하나라 한 건 실행이 덮은 회차도 그대로 찾는다
  const 회차들 = 쪽.items.flatMap((c) => c.devices.map((d) => d.firstFailedHistoryId));
  const 회차칸 = new Map(
    (
      await pool.query<{ history_id: string; device: DeviceInfo | null; element_checks: ElementCheck[] | null }>(
        'SELECT history_id, device, element_checks FROM run_item WHERE history_id = ANY($1)',
        [회차들],
      )
    ).rows.map((r) => [Number(r.history_id), r]),
  );

  // ponytail: 쪽 크기만큼 묻는다 — 쪽이 커지면 한 질의로 모은다
  const items = await Promise.all(
    쪽.items.map(async (c): Promise<FailureCase> => ({
      tcId: c.tcId,
      tcName: c.tcName,
      reqs: 요구표.get(c.tcId) ?? [],
      judgment: 판정표.get(c.tcId) ?? null,
      devices: await Promise.all(
        c.devices.map(async ({ firstFailedHistoryId, ...나머지 }): Promise<FailureDevice> => {
          const rerun = 다시실행들.get(firstFailedHistoryId) ?? null;
          const 실행번호 = rerun?.runId ?? runId;
          const item = await findItem(실행번호, firstFailedHistoryId);
          if (item === null) throw new Error(`실패 카드의 항목 ${firstFailedHistoryId}을 실행 ${실행번호}에서 찾을 수 없다`);
          const recent = 흐름.get(`${c.tcId}|${나머지.platform}`) ?? [];
          return {
            ...나머지,
            streak: 연속실패수(나머지.change, recent),
            recent,
            item,
            farm: await 팜증적목록(실행번호, firstFailedHistoryId),
            rerun,
            device: 회차칸.get(firstFailedHistoryId)?.device ?? null,
            elementChecks: 회차칸.get(firstFailedHistoryId)?.element_checks ?? [],
          };
        }),
      ),
    })),
  );

  return { ...쪽, items };
}
