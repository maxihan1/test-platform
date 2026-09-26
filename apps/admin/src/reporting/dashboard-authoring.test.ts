// Grafana 「작성 현황」 두 패널과 대시보드 계정의 칸 단위 권한을 본다 (도메인/리포팅 §8.5 · 데이터모델 「대시보드 칸 권한」)
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

function 읽기전용주소(원본: string): string {
  const 주소 = new URL(원본);
  주소.username = 'grafana_ro';
  주소.password = 'grafana_ro';
  return 주소.toString();
}

function 패널SQL(제목: string): string {
  const 패널 = 대시보드.panels.find((p) => p.title === 제목);
  if (패널 === undefined) throw new Error(`패널 없음: ${제목}`);
  return 패널.targets[0]!.rawSql;
}

describe.skipIf(연결 === undefined)('Grafana 작성 현황', () => {
  let pool: Pool;
  let 읽기전용: Client;
  let 서비스id: number;

  const 치우기 = async () => {
    await pool.query(
      "DELETE FROM authoring_request WHERE service_id IN (SELECT id FROM service WHERE prefix IN ('XDH', 'XDHOFF'))",
    );
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'XDH-%' OR tc_id LIKE 'XDHOFF-%'");
    await pool.query("DELETE FROM service WHERE prefix IN ('XDH', 'XDHOFF')");
  };

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    읽기전용 = new Client({ connectionString: 읽기전용주소(연결 as string) });
    await 읽기전용.connect();
    await 치우기();

    const 서비스 = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, is_active)
       VALUES ('XDH', 'XDH 작성 현황', '#000000', 'https://xdh.example.com', 'tests', true),
              ('XDHOFF', 'XDH 내린 서비스', '#000000', 'https://xdh.example.com', 'tests', false)
       RETURNING id`,
    );
    서비스id = Number(서비스.rows[0]!.id);

    const 케이스들 = [
      ['XDH-001', true, '10 days'],
      ['XDH-002', true, '3 days'],
      ['XDH-003', false, '20 days'],
      ['XDH-004', true, null],
      ['XDHOFF-001', true, '50 days'],
    ] as const;
    for (const [tcId, 활성, 전] of 케이스들) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active, unconfirmed, unconfirmed_since)
         VALUES ($1, $1, '', '{}', '{}', $2,
                 CASE WHEN $3::interval IS NULL THEN NULL ELSE '화면에서 본 값' END,
                 now() - $3::interval)`,
        [tcId, 활성, 전],
      );
    }

    const 요청 = async (
      종류: 'AUTHOR' | 'RERUN',
      상태: 'DONE' | 'FAILED',
      대조: boolean,
      만든때: string,
      집은때: string,
      끝난때: string,
      원본: number | null = null,
    ) => {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO authoring_request (service_id, kind, source_id, spec_text, requested_by, requested_by_name, status,
                                        compare, env, created_at, started_at, finished_at)
         VALUES ($1, $2, $3, '기획서 비밀 본문', 'tester', '시험자', $4, $5, CASE WHEN $5 THEN 'qa' END,
                 now() - $6::interval, now() - $7::interval, now() - $8::interval)
         RETURNING id`,
        [서비스id, 종류, 원본, 상태, 대조, 만든때, 집은때, 끝난때],
      );
      return Number(r.rows[0]!.id);
    };

    const 첫 = await 요청('AUTHOR', 'DONE', false, '2 days', '2 days - 10 minutes', '2 days - 40 minutes');
    await 요청('AUTHOR', 'DONE', false, '2 days', '2 days - 10 minutes', '2 days - 70 minutes');
    await 요청('AUTHOR', 'DONE', false, '2 days', '2 days - 10 minutes', '2 days - 100 minutes');
    await 요청('AUTHOR', 'DONE', false, '31 days', '29 days 60 minutes', '29 days');
    await 요청('AUTHOR', 'DONE', true, '1 day', '1 day - 20 minutes', '1 day - 260 minutes');
    await 요청('AUTHOR', 'FAILED', false, '1 day', '1 day - 5 minutes', '1 day - 65 minutes');
    await 요청('RERUN', 'DONE', false, '1 day', '1 day - 5 minutes', '1 day - 600 minutes', 첫);
    await 요청('AUTHOR', 'DONE', false, '41 days', '41 days - 5 minutes', '40 days');
  });

  afterAll(async () => {
    await 치우기();
    await pool.end();
    await 읽기전용.end();
  });

  describe('칸 단위 권한', () => {
    it.each([
      'SELECT tc_id, is_active, unconfirmed_since FROM test_case LIMIT 1',
      'SELECT id, prefix, name, is_active FROM service LIMIT 1',
      'SELECT id, service_id, kind, status, compare, created_at, started_at, finished_at FROM authoring_request LIMIT 1',
    ])('연 칸은 읽힌다 — %s', async (sql) => {
      await expect(읽기전용.query(sql)).resolves.toBeDefined();
    });

    it.each([
      'SELECT spec_text FROM authoring_request LIMIT 1',
      'SELECT test_source FROM authoring_request LIMIT 1',
      'SELECT slack_webhook FROM service LIMIT 1',
      'SELECT figma_token FROM service LIMIT 1',
      'SELECT name FROM test_case LIMIT 1',
      'SELECT unconfirmed FROM test_case LIMIT 1',
      'SELECT login_password FROM service_env LIMIT 1',
    ])('기획서 본문·비밀값은 거부된다 — %s', async (sql) => {
      await expect(읽기전용.query(sql)).rejects.toThrow(/permission denied/);
    });
  });

  describe('가장 오래된 미확정', () => {
    const 줄들 = async () =>
      (await 읽기전용.query<Record<string, string | number>>(패널SQL('가장 오래된 미확정'))).rows;

    it('활성 케이스만 세고 가장 오래된 것의 나이를 일로 낸다', async () => {
      const 줄 = (await 줄들()).find((r) => r['서비스'] === 'XDH 작성 현황');
      expect(줄).toBeDefined();
      expect(Number(줄!['미확정 건수'])).toBe(2);
      expect(Number(줄!['카탈로그에 들어온 뒤 (일)'])).toBe(10);
    });

    it('내린 서비스는 나오지 않는다', async () => {
      expect((await 줄들()).map((r) => r['서비스'])).not.toContain('XDH 내린 서비스');
    });
  });

  describe('작성에 걸린 시간', () => {
    const 줄 = async (방식: string) =>
      (await 읽기전용.query<Record<string, string | number>>(패널SQL('작성에 걸린 시간'))).rows.find(
        (r) => r['서비스'] === 'XDH 작성 현황' && r['방식'] === 방식,
      );

    it('보통 요청 — 끝난 시각 30일 안의 처음 작성만 세고 대기·작업을 갈라 분으로 낸다', async () => {
      const 보통 = await 줄('보통');
      expect(보통).toBeDefined();
      expect(Number(보통!['성공'])).toBe(4);
      expect(Number(보통!['실패'])).toBe(1);
      expect(Number(보통!['대기 중간값 (분)'])).toBe(10);
      expect(Number(보통!['작업 중간값 (분)'])).toBe(60);
      expect(Number(보통!['작업 최대 (분)'])).toBe(90);
    });

    it('화면과 대조한 요청은 따로 한 줄이다', async () => {
      const 대조 = await 줄('화면과 대조');
      expect(대조).toBeDefined();
      expect(Number(대조!['성공'])).toBe(1);
      expect(Number(대조!['실패'])).toBe(0);
      expect(Number(대조!['대기 중간값 (분)'])).toBe(20);
      expect(Number(대조!['작업 중간값 (분)'])).toBe(240);
    });
  });
});
