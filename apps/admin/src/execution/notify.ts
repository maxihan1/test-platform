// 실행이 끝났을 때 Slack 으로 알린다 (SPEC §8.9).
// 보내는 주체가 Execution 인 이유 — test_run.notified_at 에 write 해야 하는데 §3.3 이
// Reporting 의 write 를 evidence_document 하나로 막아 뒀다.
// 새 부품이 없다. 웹훅은 HTTPS 로 JSON 을 한 번 보내는 것이고 Node 20 에 fetch 가 들어 있다

import type { Pool } from 'pg';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

interface NotifyRow {
  title: string;
  status: string;
  env: string;
  service_name: string;
  triggered_by: string;
  triggered_by_name: string | null;
  slack_webhook: string | null;
  duration_ms: number | null;
  pass: number;
  fail: number;
  na: number;
  // 끝난 미확정 항목. 위 셋은 확정 항목만이다 (SPEC 실행 §3.2)
  u_pass: number;
  u_fail: number;
  u_na: number;
}

interface FailedCase {
  tc_id: string;
  tc_name: string;
  // 사유 문자열이 아니라 여부다. run_item.unconfirmed(사유)와 헷갈리지 않게 이름을 갈랐다
  is_unconfirmed?: boolean;
}

// 「보낼 생각이 없었던 것」과 「보내려다 실패한 것」을 가르려면 notify_slack 과 notified_at 이 둘 다 필요하다 (§6)
const TARGET = `
  SELECT r.title, r.status, r.env, r.service_name, r.triggered_by, r.triggered_by_name,
         s.slack_webhook,
         EXTRACT(EPOCH FROM (r.finished_at - r.started_at)) * 1000 AS duration_ms,
         count(i.history_id) FILTER (WHERE i.status = 'PASS' AND i.unconfirmed IS NULL)::int AS pass,
         count(i.history_id) FILTER (WHERE i.status = 'FAIL' AND i.unconfirmed IS NULL)::int AS fail,
         count(i.history_id) FILTER (WHERE i.status = 'NA' AND i.unconfirmed IS NULL)::int AS na,
         count(i.history_id) FILTER (WHERE i.status = 'PASS' AND i.unconfirmed IS NOT NULL)::int AS u_pass,
         count(i.history_id) FILTER (WHERE i.status = 'FAIL' AND i.unconfirmed IS NOT NULL)::int AS u_fail,
         count(i.history_id) FILTER (WHERE i.status = 'NA' AND i.unconfirmed IS NOT NULL)::int AS u_na
    FROM test_run r
    LEFT JOIN service s ON s.id = r.service_id
    LEFT JOIN run_item i USING (run_id)
   WHERE r.run_id = $1 AND r.notify_slack AND r.notified_at IS NULL
   GROUP BY r.run_id, s.slack_webhook`;

// 색 막대를 쓰지 않는다. 판정은 글자로도 읽혀야 한다 (DESIGN.md).
// SPEC §8.9 는 머리글 셋만 정하고 「미실행만 남은 실행」을 어느 쪽으로 볼지는 적지 않았다.
// 실패로 본다 — 러너가 전부 죽어 한 건도 못 돈 실행에 [통과]가 나가면 아무도 안 본다.
// 미확정도 같은 원칙이다 — 미확정 미실행을 실패 수에 넣는다 (2026-09-26 게이트 1).
// 판정은 확정 항목만으로 가르고, 미확정 실패는 머리에 남긴다 — 「화면이 바뀌었다」는 신호가 숫자 줄에 묻히지 않게 (SPEC 실행 §3.2)
function 머리글(run: NotifyRow): string {
  if (run.status === 'ABORTED') return '[중단]';
  if (run.fail + run.na > 0) return '[실패]';
  const 미확정실패 = run.u_fail + run.u_na;
  if (run.pass === 0 && run.u_pass + 미확정실패 > 0) return 미확정실패 > 0 ? `[미확정 · 실패 ${미확정실패}]` : '[미확정]';
  return 미확정실패 > 0 ? `[통과 · 미확정 실패 ${미확정실패}]` : '[통과]';
}

// 미확정이 없으면 묶음을 아예 쓰지 않는다. 0 인 칸은 뺀다 (SPEC 실행 §3.2 「미확정 항목은 따로 센다」)
function 미확정묶음(run: NotifyRow): string {
  const 합 = run.u_pass + run.u_fail + run.u_na;
  if (합 === 0) return '';
  const 칸 = [
    [run.u_pass, '통과'],
    [run.u_fail, '실패'],
    [run.u_na, '미실행'],
  ].filter(([n]) => n !== 0).map(([n, 이름]) => `${이름} ${n}`);
  return ` · 미확정 ${합}(${칸.join(' · ')})`;
}

export function 걸린시간(ms: number | null): string {
  if (ms === null || ms <= 0) return '시간 미상';
  const 초 = Math.round(ms / 1000);
  return 초 < 60 ? `${초}초` : `${Math.floor(초 / 60)}분 ${String(초 % 60).padStart(2, '0')}초`;
}

export function 본문(run: NotifyRow, 실패: FailedCase[], publicUrl: string, runId: number): string {
  const 머리 = 머리글(run);
  const 실행자 = run.triggered_by_name ?? run.triggered_by;

  const 줄 = [
    `${머리} ${run.service_name} · RUN ${runId} · ${run.title}`,
    `통과 ${run.pass} · 실패 ${run.fail} · 미실행 ${run.na}${미확정묶음(run)} · ${걸린시간(run.duration_ms)} · 대상 서버 ${run.env} · 실행자 ${실행자}`,
  ];

  // 숫자만 보여주면 사람이 결국 목록을 뒤져야 한다. 다섯을 넘으면 앞의 다섯만 적는다.
  // 확정 실패를 먼저 적고 미확정 실패는 꼬리를 붙여 뒤에 둔다 (2026-09-26 사용자 결정)
  if (실패.length > 0) {
    줄.push('', '실패한 케이스');
    const 차례 = [...실패.filter((c) => c.is_unconfirmed !== true), ...실패.filter((c) => c.is_unconfirmed === true)];
    for (const c of 차례.slice(0, 5)) 줄.push(`  ${c.tc_id}  ${c.tc_name}${c.is_unconfirmed === true ? '  (미확정)' : ''}`);
    if (실패.length > 5) 줄.push(`  외 ${실패.length - 5}건`);
  }

  // 요약 페이지를 새로 만들지 않는다. 결과 보기는 §8.3 그 화면의 주소다.
  // 주소를 모르면 링크 줄을 아예 뺀다 — 틀린 주소를 보내는 것보다 없는 편이 낫다 (§9)
  if (publicUrl !== '') {
    줄.push('', `결과 보기 ${publicUrl.replace(/\/$/, '')}/runs/${runId}`);
  }

  return 줄.join('\n');
}

// 보내기 실패는 실행 실패가 아니다. 실행은 이미 끝났고 결과는 test_run 에 남아 있다.
// 재시도하지 않는다 — 알림은 편의지 기록이 아니다 (SPEC §8.9)
export async function notifyRun(runId: number): Promise<boolean> {
  const pool = await db();
  const found = await pool.query<NotifyRow>(TARGET, [runId]);
  const run = found.rows[0];
  if (run === undefined || run.slack_webhook === null || run.slack_webhook === '') return false;

  const 실패 = await pool.query<FailedCase>(
    "SELECT DISTINCT tc_id, tc_name, unconfirmed IS NOT NULL AS is_unconfirmed FROM run_item WHERE run_id = $1 AND status = 'FAIL' ORDER BY tc_id",
    [runId],
  );

  const text = 본문(run, 실패.rows, process.env.PLATFORM_PUBLIC_URL ?? '', runId);
  const res = await fetch(run.slack_webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return false;

  await pool.query('UPDATE test_run SET notified_at = now() WHERE run_id = $1', [runId]);
  return true;
}
