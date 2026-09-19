// CI에는 postgres가 없다. DB를 쓰는 갈래만 DATABASE_URL이 있을 때 돈다

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  경로접두사,
  번호로찾을것,
  분류됐나,
  서비스에안매인다,
  서비스없음,
  자원의서비스,
  틀을주소로,
} from './scope.js';

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

describe('라우트가 분류됐는가', () => {
  it('등록된 틀을 실제 주소 모양으로 바꿔 같은 판정기를 태운다', () => {
    expect(틀을주소로('/api/runs/:runId/items/:historyId')).toBe('/api/runs/1/items/1');
    expect(틀을주소로('/api/screenshots/:runId/:historyId/:seq.png')).toBe('/api/screenshots/1/1/1.png');
    expect(틀을주소로('/api/cases/:tcId/history')).toBe('/api/cases/ZZPROBE-001/history');
  });

  it('열두 경로와 매이지 않는 자리는 전부 분류돼 있다', () => {
    for (const 틀 of [
      '/api/runs/:runId',
      '/api/runs/:runId/items/:historyId',
      '/api/screenshots/:runId/:historyId/:seq.png',
      '/api/runs/:runId/abort',
      '/api/runs/:runId/evidence',
      '/api/evidence/:id',
      '/api/param-sets/:id',
      '/api/cases/:tcId/history',
      '/api/cases/:tcId/param-sets',
      '/api/catalog/cases/:tcId',
      '/api/catalog/cases/:tcId/source',
      '/api/auth/me',
      '/api/settings/services/:id',
      '/api/catalog/scan',
      '/api/runs/last-by-case',
      '/api/runs',
      '/api/catalog/cases',
    ]) {
      expect(분류됐나(틀), 틀).toBe(true);
    }
  });

  // 「안 매인다」를 앞부분만 보고 판정하면 /api/runs 가 /api/runs/5867 까지 삼킨다.
  // 그러면 번호로 부르는 자리가 조용히 검사 밖으로 나간다
  it('안 매이는 주소는 정확히 그 주소일 때만이다', () => {
    expect(서비스에안매인다('/api/runs')).toBe(true);
    expect(서비스에안매인다('/api/runs/5867')).toBe(false);
    expect(서비스에안매인다('/api/catalog/cases')).toBe(true);
    expect(서비스에안매인다('/api/catalog/cases/DEMO-001')).toBe(false);
  });

  it('아무 데도 안 걸리는 새 라우트는 분류 안 된 것이다', () => {
    expect(분류됐나('/api/새로운것')).toBe(false);
    expect(분류됐나('/api/reports/:reportId')).toBe(false);
  });

  // ★ 이 검사가 이번 사고의 재발을 막는 자리다.
  // 문은 아는 경로만 막고 모르는 경로는 지나보낸다 — 즉 새 라우트의 기본값이 「검사 안 함」이다.
  // 이번 구멍도 누가 뚫은 것이 아니라 목록에서 빠졌을 뿐이다.
  // **소스에 실제로 등록된 라우트를 훑는다.** 검사용 가짜 라우트를 훑으면
  // 진짜 라우트가 늘어도 아무 신호가 안 뜬다
  it('소스에 등록된 /api 라우트가 전부 분류돼 있다', () => {
    const 등록된것 = 소스의라우트들();
    expect(등록된것.length, '라우트를 하나도 못 읽었다 — 읽는 방식이 깨졌다').toBeGreaterThan(15);

    const 분류안된것 = 등록된것.filter((경로) => !분류됐나(경로));
    expect(
      분류안된것,
      `분류되지 않은 라우트: ${분류안된것.join(' · ')}\n` +
        `서비스에 매이면 scope.ts 의 경로/번호 규칙에, 안 매이면 서비스에안매인다 목록에 넣어라.`,
    ).toEqual([]);
  });
});

/** 라우트 파일에서 등록된 경로를 그대로 읽는다. app.ts 가 전부 `/api` 접두사로 등록한다 */
function 소스의라우트들(): string[] {
  const 뿌리 = resolve(process.cwd(), 'apps/admin/src');
  const 파일들 = readdirSync(뿌리, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(뿌리, d.name, 'routes.ts'))
    .filter((p) => existsSync(p));

  const 등록 = /\bapp\.(get|post|patch|put|delete|head)\s*(?:<[\s\S]*?>)?\s*\(\s*'([^']+)'/g;
  const 경로들 = new Set<string>();
  for (const 파일 of 파일들) {
    const 글 = readFileSync(파일, 'utf8');
    for (const 맞은것 of 글.matchAll(등록)) {
      경로들.add(`/api${맞은것[2] ?? ''}`);
    }
  }
  return [...경로들];
}

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
