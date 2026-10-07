// 실행 결과 화면의 실패 케이스 카드 질의 — 확정 실패 · 변화 · 최근 흐름 · 처음 실패한 회차의 항목 상세 (도메인/리포팅 §7)

import type { ItemStatus, Platform } from '@platform/kit';

import { findItem } from '../execution/queries.js';
import { 최근몇건 } from '../execution/history.js';
import type { RunItemDetail } from '../execution/runTypes.js';
import { 판정접기식 } from './dashboardSql.js';
import { 연속실패수, 쪽을자른다, 케이스로묶는다, type 실패행, type 실패디바이스, type 카드변화 } from './failuresShape.js';
import { compareWithPrevious, db } from './insights.js';

export interface FailureDevice extends Omit<실패디바이스, 'firstFailedHistoryId'> {
  streak: number | null;
  recent: ItemStatus[];
  item: RunItemDetail;
}

export interface FailureCase {
  tcId: string;
  tcName: string;
  devices: FailureDevice[];
}

export interface FailureCards {
  items: FailureCase[];
  total: number;
  page: number;
  pageSize: number;
}

// 같은 서비스 · env · 종류의 끝난 실행을 이번 실행까지 모아 실행마다 회차를 접고, 쌍마다 새 것부터 최근몇건만 남긴다.
// 앞 실행은 insights 의 직전 실행처럼 started_at 이 더 이른 것만이다 — 시각이 같은 실행이 끼면 streak 이 계속깨짐을 정한 실행과 어긋난다.
// 미확정 항목은 칸이 안 된다 — 미확정만 있던 실행은 행이 없어 그 실행이 통째로 빠진다
const 최근흐름SQL = `
  SELECT x.tc_id, x.platform, x.verdict
  FROM (
    SELECT i.tc_id, i.platform, ${판정접기식} AS verdict,
           ROW_NUMBER() OVER (PARTITION BY i.tc_id, i.platform ORDER BY r.started_at DESC, r.run_id DESC) AS n
    FROM test_run t
    JOIN test_run r ON r.service_id = t.service_id AND r.env = t.env AND r.kind = t.kind
                   AND r.status <> 'RUNNING' AND (r.run_id = t.run_id OR r.started_at < t.started_at)
    JOIN run_item i ON i.run_id = r.run_id AND i.unconfirmed IS NULL
    WHERE t.run_id = $1
      AND (i.tc_id, i.platform) IN (SELECT * FROM unnest($2::text[], $3::text[]))
    GROUP BY r.run_id, r.started_at, i.tc_id, i.platform
  ) x
  WHERE x.n <= $4
  ORDER BY x.tc_id, x.platform, x.n`;

const 실패행들SQL = `
  SELECT history_id, tc_id, tc_name, platform, attempt, status
  FROM run_item
  WHERE run_id = $1 AND unconfirmed IS NULL`;

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
  }>(실패행들SQL, [runId]);
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

  // ponytail: 쪽 크기만큼 묻는다 — 쪽이 커지면 한 질의로 모은다
  const items = await Promise.all(
    쪽.items.map(async (c): Promise<FailureCase> => ({
      tcId: c.tcId,
      tcName: c.tcName,
      devices: await Promise.all(
        c.devices.map(async ({ firstFailedHistoryId, ...나머지 }): Promise<FailureDevice> => {
          const item = await findItem(runId, firstFailedHistoryId);
          if (item === null) throw new Error(`실패 카드의 항목 ${firstFailedHistoryId}을 실행 ${runId}에서 찾을 수 없다`);
          const recent = 흐름.get(`${c.tcId}|${나머지.platform}`) ?? [];
          return { ...나머지, streak: 연속실패수(나머지.change, recent), recent, item };
        }),
      ),
    })),
  );

  return { ...쪽, items };
}
