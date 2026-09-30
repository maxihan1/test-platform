// Grafana 「작성 커버리지」 패널 — 실행마다 기획서 요구를 얼마나 덮었나 (도메인/리포팅 §8.5 · 데이터모델 「대시보드 칸 권한」)
// CI에는 postgres가 없을 수 있다. 실접속 검사는 DATABASE_URL이 있을 때만 돈다

import { readFileSync } from 'node:fs';

import { Client, Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type 패널 = { title: string; targets: { rawSql: string }[] };

const 대시보드 = JSON.parse(
  readFileSync(
    new URL('../../../../infra/grafana/provisioning/dashboards/test-platform.json', import.meta.url),
    'utf8',
  ),
) as { panels: 패널[] };

const 연결 = process.env.DATABASE_URL;
// fixture 접두사 — 자기 service_id 로만 지운다 (CLAUDE.md §3)
const 접두사 = 'XDJ';
const 서비스이름 = 'XDJ 작성 커버리지';

function 패널SQL(제목: string): string {
  const 패널 = 대시보드.panels.find((p) => p.title === 제목);
  if (패널 === undefined) throw new Error(`패널 없음: ${제목}`);
  return 패널.targets[0]!.rawSql;
}

function 읽기전용주소(원본: string): string {
  const 주소 = new URL(원본);
  주소.username = 'grafana_ro';
  주소.password = 'grafana_ro';
  return 주소.toString();
}

describe('작성 커버리지 패널 글', () => {
  it('중단 이유 글은 작성 토큰 패널과 같은 말이다 — 두 패널이 같은 중단을 다르게 부르지 않게', () => {
    const 이유글 = /CASE a\.stop_reason[\s\S]*?END/.exec(패널SQL('작성 토큰'))?.[0];
    expect(이유글).toBeDefined();
    expect(패널SQL('작성 커버리지')).toContain(이유글);
  });

  it('케이스 % 는 요구 0개에서 0 으로 나누지 않는다', () => {
    expect(패널SQL('작성 커버리지')).toContain('NULLIF(a.coverage_total, 0)');
  });
});

describe.skipIf(연결 === undefined)('작성 커버리지 패널 SQL', () => {
  let pool: Pool;
  let 읽기전용: Client;
  let 서비스 = 0;

  const 치우기 = async () => {
    if (서비스 === 0) return;
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  };

  const 넣기 = async (
    종류: 'AUTHOR' | 'RERUN' | 'MERGE',
    상태: 'DONE' | 'FAILED' | 'STOPPED',
    끝난때: string,
    셈: [number, number, number | null, number, number] | null,
    원본: number | null = null,
  ) => {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, requested_by, requested_by_name, status,
                                      created_at, started_at, finished_at, stop_reason, stopped_by,
                                      coverage_total, coverage_cased, coverage_held, coverage_excluded, coverage_missing)
       VALUES ($1, $2, $3, 'tester', '시험자', $4, now() - $5::interval, now() - $5::interval, now() - $5::interval,
               CASE WHEN $4 = 'STOPPED' THEN 'REJECTED' END, CASE WHEN $4 = 'STOPPED' THEN 'system' END,
               $6, $7, $8, $9, $10)
       RETURNING id`,
      [서비스, 종류, 원본, 상태, 끝난때, ...(셈 ?? [null, null, null, null, null])],
    );
    return Number(r.rows[0]!.id);
  };

  const 줄들 = async () =>
    (
      await 읽기전용.query<Record<string, unknown>>(
        `SELECT * FROM (${패널SQL('작성 커버리지')}) 패널 WHERE "서비스" = $1`,
        [서비스이름],
      )
    ).rows;

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    읽기전용 = new Client({ connectionString: 읽기전용주소(연결 as string) });
    await 읽기전용.connect();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#000000', 'https://xdj.example.com', 'tests')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사, 서비스이름],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);

    const 원본 = await 넣기('AUTHOR', 'DONE', '1 minute', [10, 4, 1, 5, 1]);
    await 넣기('RERUN', 'STOPPED', '2 minutes', [8, 2, null, 6, 0], 원본);
    await 넣기('AUTHOR', 'DONE', '3 minutes', null);
    await 넣기('AUTHOR', 'FAILED', '4 minutes', null);
    await 넣기('MERGE', 'DONE', '5 minutes', null, 원본);
    await 넣기('AUTHOR', 'DONE', '6 minutes', [0, 0, 0, 0, 0]);
    await 넣기('AUTHOR', 'DONE', '31 days', [3, 3, 0, 0, 0]);
  });

  afterAll(async () => {
    await 치우기();
    await 읽기전용.end();
    await pool.end();
  });

  it('최근 30일 끝난 작성 · 재실행만 최근 것부터 — 칸이 빈 실패와 반영은 안 나온다', async () => {
    const r = await 줄들();
    expect(r.map((줄) => [줄['방식'], 줄['결과'], 줄['요구']])).toEqual([
      ['보통', '성공', 10],
      ['재실행', '중단 · 올리기 거절', 8],
      ['보통', '성공', null],
      ['보통', '성공', 0],
    ]);
  });

  it('케이스 % 는 덮은 수 / 요구 수이고 요구 0개면 비운다', async () => {
    const r = await 줄들();
    expect(r.map((줄) => (줄['케이스 %'] === null ? null : Number(줄['케이스 %'])))).toEqual([40, 25, null, null]);
  });

  it('성공인데 칸이 비면 원장 없음이라 적는다 · 보류를 모르면 비운다', async () => {
    const r = await 줄들();
    expect(r.map((줄) => 줄['비고'])).toEqual(['', '', '원장 없음', '']);
    expect(r.map((줄) => 줄['보류로만'])).toEqual([1, null, null, 0]);
  });
});
