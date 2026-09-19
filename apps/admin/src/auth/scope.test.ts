// CI에는 postgres가 없다. DB를 쓰는 갈래만 DATABASE_URL이 있을 때 돈다

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 경로접두사, 번호로찾을것, 서비스없음, 자원의서비스 } from './scope.js';

const 연결 = process.env.DATABASE_URL;

describe('경로에 박힌 접두사', () => {
  it('tcId 가 경로에 있으면 그 접두사를 낸다', () => {
    expect(경로접두사('/api/cases/DEMO-001/history')).toEqual(['DEMO']);
    expect(경로접두사('/api/cases/DEMO-001/param-sets')).toEqual(['DEMO']);
    expect(경로접두사('/api/catalog/cases/ZZA-007')).toEqual(['ZZA']);
    expect(경로접두사('/api/catalog/cases/XFS1-012/source')).toEqual(['XFS1']);
  });

  it('tcId 가 없는 경로는 빈 목록이다', () => {
    expect(경로접두사('/api/catalog/cases')).toEqual([]);
    expect(경로접두사('/api/runs/5867')).toEqual([]);
    expect(경로접두사('/api/auth/me')).toEqual([]);
  });

  // 접두사 모양은 SPEC §2 가 정한다. 모양이 아닌 것을 서비스로 읽으면
  // 있지도 않은 서비스를 배정 목록과 맞춰 보게 된다
  it('§2 의 접두사 모양이 아니면 빈 목록이다', () => {
    expect(경로접두사('/api/cases/없는거/history')).toEqual([]);
    expect(경로접두사('/api/cases/demo-001/history')).toEqual([]);
    expect(경로접두사('/api/cases/TOOLONGPREFIXX-001/history')).toEqual([]);
  });

  // 주소에 실려 온 글자라 %2F·../ 같은 것이 섞일 수 있다.
  // 모양 검사가 먼저 걸러 주지만 단언으로 못 박아 둔다
  it('경로를 거슬러 올라가려는 글자는 접두사가 아니다', () => {
    expect(경로접두사('/api/cases/..%2F..%2Fetc-001/history')).toEqual([]);
    expect(경로접두사('/api/catalog/cases/../../secret')).toEqual([]);
  });
});

describe('번호로 부르는 자리', () => {
  it('무엇을 찾아야 하는지 낸다', () => {
    expect(번호로찾을것('/api/runs/5867')).toEqual({ 종류: '실행', 번호: 5867 });
    expect(번호로찾을것('/api/runs/5867/abort')).toEqual({ 종류: '실행', 번호: 5867 });
    expect(번호로찾을것('/api/runs/5867/items/42')).toEqual({ 종류: '실행', 번호: 5867 });
    expect(번호로찾을것('/api/screenshots/5867/42/3.png')).toEqual({ 종류: '실행', 번호: 5867 });
    expect(번호로찾을것('/api/evidence/11')).toEqual({ 종류: '증적', 번호: 11 });
    expect(번호로찾을것('/api/param-sets/9')).toEqual({ 종류: '입력값묶음', 번호: 9 });
  });

  it('번호로 부르지 않는 자리는 null 이다', () => {
    expect(번호로찾을것('/api/runs')).toBeNull();
    expect(번호로찾을것('/api/runs/last-by-case')).toBeNull();
    expect(번호로찾을것('/api/auth/me')).toBeNull();
  });
});

describe.skipIf(연결 === undefined)('번호가 어느 서비스인가', () => {
  let 실행번호 = 0;
  let 서비스없는실행번호 = 0;
  let 증적번호 = 0;
  let 입력값묶음번호 = 0;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const 서비스 = await pool.query<{ id: number }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XFS5', '경계 검사용', '#3A5FCD', '', 'xfs5')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    const 서비스id = 서비스.rows[0]!.id;

    const 실행 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_id, service_name, tests_repo, triggered_by, env, base_url, status)
            VALUES ('XFS5 경계 검사', $1, '경계 검사용', '', 'xfs5-사람', 'qa', 'https://qa.xfs5.test', 'FINISHED')
         RETURNING run_id`,
      [서비스id],
    );
    실행번호 = Number(실행.rows[0]!.run_id);

    // 서비스 통합 이전 행. service_id 와 service_name 이 짝으로 비어야 CHECK 를 지난다 (§6)
    const 옛실행 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status)
            VALUES ('XFS5 통합 이전', '', '', 'xfs5-사람', 'qa', 'https://qa.xfs5.test', 'FINISHED')
         RETURNING run_id`,
    );
    서비스없는실행번호 = Number(옛실행.rows[0]!.run_id);

    const 증적 = await pool.query<{ id: string }>(
      `INSERT INTO evidence_document (run_id, format, status) VALUES ($1, 'PDF', 'READY') RETURNING id`,
      [실행번호],
    );
    증적번호 = Number(증적.rows[0]!.id);

    // test_case 에는 서비스 칸이 없다. tc_id 접두사가 서비스를 가리키는 유일한 길이다 (§2 · §6)
    await pool.query(
      `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema)
            VALUES ('XFS5-001', '경계 검사용 케이스', 'xfs5/a.spec.ts', '[]'::jsonb, '[]'::jsonb)
       ON CONFLICT (tc_id) DO UPDATE SET is_active = true`,
    );
    const 묶음 = await pool.query<{ id: string }>(
      `INSERT INTO param_set (tc_id, name, params, expected)
            VALUES ('XFS5-001', 'XFS5 기본', '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (tc_id, name) DO UPDATE SET params = EXCLUDED.params
         RETURNING id`,
    );
    입력값묶음번호 = Number(묶음.rows[0]!.id);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM evidence_document WHERE run_id IN ($1, $2)`, [
      실행번호,
      서비스없는실행번호,
    ]);
    await pool.query(`DELETE FROM param_set WHERE tc_id LIKE 'XFS5-%'`);
    await pool.query(`DELETE FROM test_case WHERE tc_id LIKE 'XFS5-%'`);
    await pool.query(`DELETE FROM test_run WHERE run_id IN ($1, $2)`, [실행번호, 서비스없는실행번호]);
    await pool.query(`DELETE FROM service WHERE prefix = 'XFS5'`);
  });

  it('실행 번호로 그 서비스를 찾는다', async () => {
    expect(await 자원의서비스({ 종류: '실행', 번호: 실행번호 })).toBe('XFS5');
  });

  it('증적 번호는 그 실행을 거쳐 서비스에 닿는다', async () => {
    expect(await 자원의서비스({ 종류: '증적', 번호: 증적번호 })).toBe('XFS5');
  });

  it('입력값 묶음은 케이스 번호 접두사가 곧 서비스다', async () => {
    expect(await 자원의서비스({ 종류: '입력값묶음', 번호: 입력값묶음번호 })).toBe('XFS5');
  });

  it('없는 번호는 null 이다 — 문이 지나보내고 라우트가 404 를 낸다', async () => {
    expect(await 자원의서비스({ 종류: '실행', 번호: 999999999 })).toBeNull();
    expect(await 자원의서비스({ 종류: '증적', 번호: 999999999 })).toBeNull();
    expect(await 자원의서비스({ 종류: '입력값묶음', 번호: 999999999 })).toBeNull();
  });

  // 어느 배정에도 안 드는 자원이다. 열어 두면 「배정받지 않은 서비스의 자원」을
  // 막으라는 §7 이 통합 이전 행 앞에서만 비켜 준 꼴이 된다
  it('서비스에 안 매인 옛 실행은 서비스없음이다', async () => {
    expect(await 자원의서비스({ 종류: '실행', 번호: 서비스없는실행번호 })).toBe(서비스없음);
  });
});
