// 앱 대시보드 질의의 SQL 글 — 접은 줄 · 앞 실행 · 실행 중 · 요구사항 커버리지 (dashboardResults.ts 가 300줄을 넘어 뗐다)

import { 종류조건 } from '../execution/runKind.js';

// 실행 한 번 안에서 한 (케이스, 디바이스)의 회차를 한 판정으로 접는 식이다. insights.ts 의 접기 · failures.ts 의 최근 흐름도 같은 식을 쓴다 — i 는 run_item 의 별칭이다
export const 판정접기식 = `CASE WHEN bool_or(i.status = 'FAIL')  THEN 'FAIL'
              WHEN bool_and(i.status = 'PASS') THEN 'PASS'
              ELSE 'NA' END`;

// 접는 규칙은 insights.ts 의 접기 SQL 과 같은 말이다 — 한 실행이 아니라 창 안 실행 전부를 한 번에 접는다.
// 갈래가 셋이다(전부 PASS = PASS · 하나라도 FAIL = FAIL · 나머지 NA). 날은 started_at 을 tz 로 자른 글자다.
// 사유는 실패한 첫 항목의 대표 문장이다(insights.ts 대표문장뽑기와 같다). actual · expected 는 읽지 않는다.
// 사유는 신규 실패(이번 창)에서만 쓰므로 $4(이번 창 첫날)보다 앞 날의 줄에는 안 뽑는다.
// started_at 은 어느 실행이 최신인지 가르는 기준이다 — insights 와 앞 실행 고르기가 같은 기준을 쓴다
// ponytail: 28일을 매번 접는다 — 설치가 커져 느리면 일별 요약 표를 둔다
export const 접은줄SQL = `
  WITH 대상 AS (
    SELECT r.run_id, r.service_id, r.service_name, r.env, r.kind,
           to_char((r.started_at AT TIME ZONE $2::text)::date, 'YYYY-MM-DD') AS day, r.started_at,
           COALESCE(r.finished_at, r.started_at) AS finished_at
    FROM test_run r
    WHERE r.service_id = ANY($1::bigint[]) AND r.status <> 'RUNNING' AND ${종류조건('case', 'r')}
      AND (r.started_at AT TIME ZONE $2::text)::date >= $3::date
  )
  SELECT t.run_id, t.service_id, t.service_name, t.env, t.kind, t.day, t.started_at, t.finished_at,
         i.tc_id, max(i.tc_name) AS tc_name, i.platform,
         ${판정접기식} AS verdict,
         bool_or(i.unconfirmed IS NOT NULL) AS unconfirmed,
         CASE WHEN bool_or(i.status = 'FAIL') AND t.day >= $4::text THEN (
           SELECT COALESCE(
                    (SELECT a.value->>'statement'
                     FROM run_item_step s
                     CROSS JOIN LATERAL jsonb_array_elements(s.assertions) WITH ORDINALITY AS a(value, ord)
                     WHERE s.history_id = f.history_id AND a.value->>'status' = 'FAIL'
                     ORDER BY s.seq, a.ord
                     LIMIT 1),
                    f.error->>'message')
           FROM run_item f
           WHERE f.run_id = t.run_id AND f.tc_id = i.tc_id AND f.platform = i.platform
             AND f.status = 'FAIL'
           ORDER BY f.history_id
           LIMIT 1) END AS reason
  FROM 대상 t JOIN run_item i ON i.run_id = t.run_id
  GROUP BY t.run_id, t.service_id, t.service_name, t.env, t.kind, t.day, t.started_at, t.finished_at, i.tc_id, i.platform`;

// 실행마다 바로 앞 끝난 실행 하나의 접은 판정이다. 같은 서비스 · env · kind 이고 진행 중은 건너뛴다.
// 앞 실행은 창 밖이어도 찾는다 — 창 첫날 실행이 「앞이 없다」가 되면 안 된다. insights.ts compareWithPrevious 와 같은 규칙.
// 넘기는 실행 번호는 이번 창 실행뿐이다(앞 판정은 이번 창 줄에서만 쓴다)
// ponytail: test_run 에 (service_id, env, kind, started_at) 인덱스가 없어 실행마다 test_run 을 훑는다 —
// 이번 창 실행 수만큼 도므로 실행이 수만 건으로 커져 느려지면 그 인덱스를 더한다(마이그레이션)
export const 앞판정SQL = `
  SELECT c.run_id AS this_run, i.tc_id, i.platform,
         ${판정접기식} AS verdict
  FROM test_run c
  CROSS JOIN LATERAL (
    SELECT p.run_id FROM test_run p
    WHERE p.service_id = c.service_id AND p.env = c.env AND p.kind = c.kind
      AND p.status <> 'RUNNING' AND p.started_at < c.started_at
    ORDER BY p.started_at DESC
    LIMIT 1) prev
  JOIN run_item i ON i.run_id = prev.run_id
  WHERE c.run_id = ANY($1::bigint[])
  GROUP BY c.run_id, i.tc_id, i.platform`;

// 항목은 끝나면 finished_at 이 찍힌다(execution/store.ts). 시나리오 실행은 케이스 실행이 아니라 뺀다
export const 실행중SQL = `
  SELECT r.run_id, r.service_id, r.service_name, r.title, r.started_at,
         count(i.history_id) AS total,
         count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL) AS done,
         count(i.history_id) FILTER (WHERE i.status = 'FAIL') AS failed
  FROM test_run r LEFT JOIN run_item i ON i.run_id = r.run_id
  WHERE r.service_id = ANY($1::bigint[]) AND r.status = 'RUNNING' AND ${종류조건('case', 'r')}
  GROUP BY r.run_id, r.service_id, r.service_name, r.title, r.started_at
  ORDER BY r.started_at DESC, r.run_id DESC`;

// 중단(STOPPED) · 실패는 대조 뒤 거절이거나 덮음이 끝나지 않아 status 조건으로 빠진다
export const 커버리지SQL = `
  SELECT DISTINCT ON (a.service_id) a.id, a.service_id, s.name, a.coverage_cased, a.coverage_total,
         a.coverage_cased_fn, a.coverage_cased_ui, a.finished_at
  FROM authoring_request a JOIN service s ON s.id = a.service_id
  WHERE a.service_id = ANY($1::bigint[]) AND a.status = 'DONE' AND a.kind IN ('AUTHOR', 'RERUN')
    AND a.coverage_total IS NOT NULL AND a.finished_at >= now() - $2::int * interval '1 day'
  ORDER BY a.service_id, a.finished_at DESC, a.id DESC`;
