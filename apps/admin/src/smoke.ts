// Phase 0의 가장 얇은 관통 (SPEC §11). 케이스 1건을 하드코딩으로 실행해 run_item에 1행을 남긴다.
// 러너 스텁의 가짜 응답으로는 관통이 아니다. 실제 브라우저가 뜬 결과의 exit code가 여기까지 와야 한다.
// 마지막에 param_set 값을 바꿔보고 run_item이 안 따라 바뀌는지까지 찍는다 — 그게 G1의 진짜 확인 항목이다

import type { ExecuteRequest, ExecuteResponse } from '@platform/kit';

// 호스트에서 npm run smoke 한 번으로 돌 수 있게 기본값을 준다. 컨테이너 안에서는 compose가 덮어쓴다
process.env.DATABASE_URL ??= 'postgres://platform:platform@localhost:5433/platform';
const runnerUrl = process.env.RUNNER_URL ?? 'http://localhost:4000';

const { pool } = await import('./db/index.js');

const CASE = {
  tcId: 'DEMO-001',
  name: '메인 화면이 열린다',
  filePath: 'demo/DEMO-001.spec.ts',
  platform: 'desktop' as const,
  precondition: [] as string[],
  paramSchema: {
    type: 'object',
    properties: { url: { type: 'string', description: '접속할 주소' } },
    required: ['url'],
  },
  expectedSchema: {
    type: 'object',
    properties: { heading: { type: 'string', description: '화면 제목' } },
    required: ['heading'],
  },
  params: { url: 'https://demo.playwright.dev/todomvc' },
  expected: { heading: 'todos' },
};

async function main(): Promise<void> {
  await pool.query(
    `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tc_id) DO UPDATE SET name = EXCLUDED.name, scanned_at = now()`,
    [
      CASE.tcId,
      CASE.name,
      JSON.stringify([CASE.platform]),
      JSON.stringify(CASE.precondition),
      CASE.filePath,
      JSON.stringify(CASE.paramSchema),
      JSON.stringify(CASE.expectedSchema),
    ],
  );

  const saved = await pool.query<{ id: string; params: Record<string, unknown>; expected: Record<string, unknown> }>(
    `INSERT INTO param_set (tc_id, name, params, expected)
     VALUES ($1, '기본값', $2, $3)
     ON CONFLICT (tc_id, name) DO UPDATE SET params = EXCLUDED.params, expected = EXCLUDED.expected
     RETURNING id, params, expected`,
    [CASE.tcId, JSON.stringify(CASE.params), JSON.stringify(CASE.expected)],
  );
  const paramSet = saved.rows[0]!;

  const run = await pool.query<{ run_id: string }>(
    `INSERT INTO test_run (title, triggered_by, status) VALUES ($1, $2, 'RUNNING') RETURNING run_id`,
    ['Phase 0 얇은 관통', 'smoke'],
  );
  const runId = Number(run.rows[0]!.run_id);

  // 참조가 아니라 값을 복사해 넣는다. param_set을 참조만 하면 나중에 값이 바뀌었을 때 과거 증적이 거짓이 된다 (SPEC §3.2)
  const item = await pool.query<{ history_id: string }>(
    `INSERT INTO run_item (run_id, tc_id, platform, tc_name, precondition, params, expected, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'NA') RETURNING history_id`,
    [
      runId,
      CASE.tcId,
      CASE.platform,
      CASE.name,
      JSON.stringify(CASE.precondition),
      JSON.stringify(paramSet.params),
      JSON.stringify(paramSet.expected),
    ],
  );
  const historyId = Number(item.rows[0]!.history_id);

  console.log(`run_id=${runId} history_id=${historyId} — 러너에 실행을 요청한다`);

  const body: ExecuteRequest = {
    runId,
    historyId,
    tcId: CASE.tcId,
    platform: CASE.platform,
    filePath: CASE.filePath,
    // 관통 확인용 케이스는 params의 url로 직접 열어서 baseURL을 쓰지 않는다
    baseUrl: '',
    params: paramSet.params,
    expected: paramSet.expected,
    timeoutMs: 120_000,
  };

  // 러너가 먼저 끊어야 부분 결과가 남는다. HTTP 타임아웃은 timeoutMs + 30초다 (SPEC §5.2)
  const res = await fetch(`${runnerUrl}/execute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(body.timeoutMs + 30_000),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`러너가 ${res.status}로 응답했다: ${detail}`);
  }

  const result = (await res.json()) as ExecuteResponse;

  await pool.query(
    `UPDATE run_item SET status = $1, duration_ms = $2, error = $3, finished_at = now() WHERE history_id = $4`,
    [result.status, result.durationMs, result.error ? JSON.stringify(result.error) : null, historyId],
  );
  await pool.query(`UPDATE test_run SET status = 'FINISHED', finished_at = now() WHERE run_id = $1`, [runId]);

  console.log(`실행 결과: ${result.status} (${result.durationMs}ms)`);
  if (result.error) console.log(`에러: ${result.error.message}`);

  // 스냅샷인지 참조인지 눈으로 확인시킨다. 저장된 입력값을 바꿔도 과거 실행 기록은 그대로여야 한다
  await pool.query(`UPDATE param_set SET params = $1 WHERE id = $2`, [
    JSON.stringify({ url: 'https://example.com/바뀐-값' }),
    paramSet.id,
  ]);
  const after = await pool.query<{ params: Record<string, unknown> }>(
    `SELECT params FROM run_item WHERE history_id = $1`,
    [historyId],
  );

  console.log('');
  console.log('param_set을 바꾼 뒤 run_item의 params:', JSON.stringify(after.rows[0]!.params));
  console.log('→ 위 값이 여전히 demo.playwright.dev 이면 스냅샷이 맞다 (SPEC §3.2 불변식)');

  await pool.end();
}

await main();
