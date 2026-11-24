// 프로시저 안 케이스의 실패를 Issue Bunker 에 올릴 때 더 싣는 재료 — 프로시저 줄 · 처음부터의 재현 단계 · 앞서 실패한 케이스 · 후속 케이스 (도메인/BTS §3.12 「테스트 프로시저 — 이슈 등록과 이슈 처리」)
// 재료는 실행에 박제한 것(run_exec · run_item.exec_seq)만 읽는다 — 케이스 카탈로그는 그 뒤 다시 묶였을 수 있다

import type { Pool } from 'pg';

import { 판정아닌까닭을가른다 } from '../execution/notVerdict.js';
import type { 프로시저재료 } from './failBody.js';

const 판정글: Record<string, string> = { PASS: 'Pass', FAIL: 'Fail', NA: 'Not tested' };

/** 그 케이스 줄이 프로시저로 돌았으면 재료와 실행 단위 번호. 옛 꼴 케이스 · 실행 단위 칸 전의 줄은 null */
export async function 프로시저재료읽기(pool: Pool, historyId: number): Promise<{ 재료: 프로시저재료; execId: number } | null> {
  const 나 = (
    await pool.query<{ run_id: string; exec_id: string; exec_seq: number | null; tc_id: string; proc_id: string; proc_name: string }>(
      `SELECT i.run_id, i.exec_id, i.exec_seq, i.tc_id, e.proc_id, e.proc_name
         FROM run_item i JOIN run_exec e ON e.exec_id = i.exec_id
        WHERE i.history_id = $1 AND e.proc_id IS NOT NULL`,
      [historyId],
    )
  ).rows[0];
  if (나 === undefined) return null;
  const 줄들 = (
    await pool.query<{ history_id: string; tc_id: string; tc_name: string; status: string; message: string | null; blocked_by: string | null; exec_seq: number | null }>(
      `SELECT history_id, tc_id, tc_name, status, error->>'message' AS message, blocked_by, exec_seq
         FROM run_item WHERE run_id = $1 AND exec_id = $2 ORDER BY exec_seq, history_id`,
      [나.run_id, 나.exec_id],
    )
  ).rows;
  const 차례 = 줄들.findIndex((r) => Number(r.history_id) === historyId);
  const 앞 = 줄들.slice(0, Math.max(0, 차례));
  const 절차 = (
    await pool.query<{ history_id: string; title: string }>('SELECT history_id, title FROM run_item_step WHERE history_id = ANY($1) ORDER BY history_id, seq', [
      앞.map((r) => r.history_id),
    ])
  ).rows;
  return {
    execId: Number(나.exec_id),
    재료: {
      id: 나.proc_id,
      name: 나.proc_name,
      seq: 차례 + 1,
      total: 줄들.length,
      앞케이스: 앞.map((r) => ({
        tcId: r.tc_id,
        tcName: r.tc_name,
        판정: 판정글[r.status] ?? r.status,
        steps: 절차.filter((s) => s.history_id === r.history_id).map((s) => s.title),
      })),
      앞실패: 앞.filter((r) => r.status === 'FAIL').map((r) => r.tc_id),
      // 이 케이스에 막힌 줄 — Blocked 는 미실행이라 판정을 가르는 한 곳을 거친다
      후속: 줄들.filter((r) => r.blocked_by === 나.tc_id && 판정아닌까닭을가른다(r.status, r.message) === 'BLOCKED').map((r) => ({ tcId: r.tc_id, tcName: r.tc_name })),
    },
  };
}
