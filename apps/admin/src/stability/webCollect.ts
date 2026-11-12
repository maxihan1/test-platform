// 웹 묶음의 콘솔 · 네트워크 줄을 읽어 센 오류를 지문마다 모은다 (도메인/안정화 §3.15 「집계」 분모 · 「무엇을 세나」)

import type { Pool } from 'pg';

import type { 모은오류, 수집 } from './save.js';
import { 웹항목오류, type 네트워크줄, type 콘솔줄 } from './webJudge.js';

interface 항목행 {
  history_id: string;
  tc_id: string;
  status: string;
  base_url: string;
  began_at: Date;
  trace: string | null;
}

/** 묶음(실행 번호들)의 웹 항목을 모은다. trace 상태가 DONE 이 아닌 항목은 기록 없음이라 분모에서도 뺀다 */
export async function 웹수집(pool: Pool, serviceId: number, runIds: readonly number[]): Promise<수집> {
  const 항목 = (
    await pool.query<항목행>(
      // 항목이 실제로 돈 시각 — started_at 은 실행을 만들 때 찍혀 견본 시각으로 못 쓴다
      `SELECT i.history_id, i.tc_id, i.status, r.base_url, t.status AS trace,
              COALESCE(i.finished_at - COALESCE(i.duration_ms, 0) * interval '1 millisecond', i.started_at) AS began_at
         FROM run_item i JOIN test_run r ON r.run_id = i.run_id LEFT JOIN run_trace t ON t.history_id = i.history_id
        WHERE i.run_id = ANY($1) ORDER BY i.history_id`,
      [runIds],
    )
  ).rows;
  const 판정 = new Map<string, boolean>();
  const 기록있음 = 항목.filter((i) => i.trace === 'DONE');
  for (const i of 기록있음) 판정.set(i.tc_id, true);
  // 케이스 판정은 그 케이스의 항목 전부로 — 기록 없는 항목이 실패여도 판정은 실패다
  for (const i of 항목) if (판정.has(i.tc_id) && i.status !== 'PASS') 판정.set(i.tc_id, false);

  const 번호 = 기록있음.map((i) => Number(i.history_id));
  // 축이 여럿이면 하나라도 예외면 예외 케이스다 — 예외 줄이 하나라도 있는 케이스를 고른다
  const 예외 = new Set(
    (
      await pool.query<{ tc_id: string }>(
        "SELECT DISTINCT tc_id FROM req_case WHERE service_id = $1 AND tc_id = ANY($2) AND axis = '예외'",
        [serviceId, [...판정.keys()]],
      )
    ).rows.map((r) => r.tc_id),
  );
  // 판정에 쓰는 줄만 — 콘솔은 오류 둘, 네트워크는 페이지 이동(화면 주소) · 실패 줄
  const 콘솔 = 묶기(
    (
      await pool.query<콘솔줄 & { history_id: string }>(
        `SELECT history_id, ord, seq, at_ms AS "atMs", level, text, url FROM run_console
          WHERE history_id = ANY($1) AND level IN ('pageerror', 'error')`,
        [번호],
      )
    ).rows,
  );
  const 네트워크 = 묶기(
    (
      await pool.query<네트워크줄 & { history_id: string }>(
        `SELECT history_id, ord, seq, at_ms AS "atMs", method, url, status, resource_type AS "resourceType", failure FROM run_network
          WHERE history_id = ANY($1) AND (resource_type = 'document' OR status >= 400 OR (status IS NULL AND failure IS NOT NULL))`,
        [번호],
      )
    ).rows,
  );

  const 오류 = new Map<string, 모은오류>();
  for (const i of 기록있음) {
    const h = Number(i.history_id);
    for (const e of 웹항목오류(콘솔.get(h) ?? [], 네트워크.get(h) ?? [], 예외.has(i.tc_id), i.base_url)) {
      const 자리 = 오류.get(e.fingerprint) ?? { 지문: { source: e.source, fingerprint: e.fingerprint, title: e.title, message: e.message }, 발생: [], 견본: [] };
      자리.발생.push({ historyId: h, tcId: i.tc_id, itemStatus: i.status, seq: e.seq, hits: e.hits, crash: false, device: null });
      자리.견본.push({ historyId: h, tcId: i.tc_id, text: e.sample, page: e.page, device: null, at: new Date(i.began_at.getTime() + e.atMs) });
      오류.set(e.fingerprint, 자리);
    }
  }
  return { 판정, 오류, crashes: null };
}

function 묶기<T extends { history_id: string }>(줄: T[]): Map<number, T[]> {
  const 모음 = new Map<number, T[]>();
  for (const l of 줄) {
    const h = Number(l.history_id);
    const 있던 = 모음.get(h);
    if (있던 === undefined) 모음.set(h, [l]);
    else 있던.push(l);
  }
  return 모음;
}
