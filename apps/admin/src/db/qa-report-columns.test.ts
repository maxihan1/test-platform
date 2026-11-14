// QA 리포트 표 검사 — 승인 전 하나 · 승인 칸 묶음 · 지워도 남는 리포트 · 새 칸 · REPORT_RISK (SPEC 공통/4-데이터모델 「QA 리포트 표」 QAR-F1-02)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XQA';

describe.skipIf(연결 === undefined)('QA 리포트 표', () => {
  let 서비스 = 0;
  let 프로젝트 = 0;
  const 열쇠 = `B:${접두사}:demo:1.0.0`;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 리포트 = (version: number, 승인 = false, 묶음: { build?: string | null; run?: number | null } = { build: '1.0.0' }) =>
    q(
      `INSERT INTO qa_report (bundle_key, service_id, service_name, env, build_no, run_id, version, summary, approved_by, approved_at, pdf_path, pdf_sha256)
       VALUES ($1, $2, '${접두사} 앱', 'demo', $3, $4, $5, '{}', $6, $7, $8, $9)`,
      [열쇠, 서비스, 묶음.build ?? null, 묶음.run ?? null, version, 승인 ? 'xqa' : null, 승인 ? new Date() : null, 승인 ? '/x.pdf' : null, 승인 ? 'ab' : null],
    );

  beforeAll(async () => {
    const p = await q<{ id: string }>(`INSERT INTO project (name) VALUES ('${접두사} 프로젝트') RETURNING id`);
    프로젝트 = Number(p.rows[0]!.id);
    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id)
            VALUES ($1, $2, '#3A5FCD', '', 'xqa', $3)
       ON CONFLICT (prefix) DO UPDATE SET is_active = true, project_id = $3
         RETURNING id`,
      [접두사, `${접두사} QA 리포트 표 검사용`, 프로젝트],
    );
    서비스 = Number(r.rows[0]!.id);
    await q('DELETE FROM qa_report WHERE bundle_key = $1', [열쇠]);
  });

  afterAll(async () => {
    await q('DELETE FROM qa_report WHERE bundle_key = $1', [열쇠]);
    await q("DELETE FROM qa_project_report WHERE project_name = 'XQA 프로젝트'");
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await q('DELETE FROM project WHERE id = $1', [프로젝트]);
  });

  it('묶음마다 승인 전 버전은 하나이고 승인한 버전은 여럿 남는다', async () => {
    await 리포트(1, true);
    await 리포트(2);
    await expect(리포트(3)).rejects.toThrow(/duplicate key/);
    await expect(리포트(2, true)).rejects.toThrow(/duplicate key/);
  });

  it('승인자 · 승인 시각 · PDF 경로 · 지문은 함께 차거나 함께 빈다', async () => {
    await expect(
      q(`INSERT INTO qa_report (bundle_key, service_name, env, build_no, version, summary, approved_by, approved_at) VALUES ($1, 'x', 'demo', '1.0.0', 9, '{}', 'xqa', now())`, [열쇠]),
    ).rejects.toThrow(/check constraint/);
  });

  it('빌드 · 실행 · 성능 실행 중 하나만 묶음이 된다', async () => {
    await expect(리포트(5, true, { build: '1.0.0', run: 1 })).rejects.toThrow(/check constraint/);
    await expect(리포트(5, true, { build: null })).rejects.toThrow(/check constraint/);
  });

  it('애플리케이션 · 프로젝트를 지워도 리포트는 이름 사본과 함께 남는다', async () => {
    await q(
      `INSERT INTO qa_project_report (project_id, project_name, period_from, period_to, tz, origin, body, created_by)
       VALUES ($1, 'XQA 프로젝트', '2026-11-01', '2026-11-14', 'Asia/Seoul', 'MANUAL', '{}', 'xqa')`,
      [프로젝트],
    );
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await q('DELETE FROM project WHERE id = $1', [프로젝트]);
    const 앱 = await q<{ service_id: string | null; service_name: string }>('SELECT service_id, service_name FROM qa_report WHERE bundle_key = $1', [열쇠]);
    expect(앱.rows.length).toBe(2);
    expect(앱.rows.every((r) => r.service_id === null && r.service_name === 'XQA 앱')).toBe(true);
    const 프 = await q<{ project_id: string | null }>("SELECT project_id FROM qa_project_report WHERE project_name = 'XQA 프로젝트'");
    expect(프.rows).toEqual([{ project_id: null }]);
  });

  it('프로젝트 리포트 기간은 양 끝을 넣어 92일까지만 받는다', async () => {
    const 기간 = (to: string) =>
      q(
        `INSERT INTO qa_project_report (project_name, period_from, period_to, tz, origin, body, created_by)
         VALUES ('XQA 프로젝트', '2026-01-01', $1, 'Asia/Seoul', 'MANUAL', '{}', 'xqa')`,
        [to],
      );
    await 기간('2026-04-02');
    await expect(기간('2026-04-03')).rejects.toThrow(/check constraint/);
    await expect(기간('2025-12-31')).rejects.toThrow(/check constraint/);
  });

  it('실행 항목 테스트 버전 칸 · 성능 실행 빌드 칸이 있고 비어도 된다', async () => {
    const r = await q<{ table_name: string; column_name: string; is_nullable: string }>(
      `SELECT table_name, column_name, is_nullable FROM information_schema.columns
        WHERE (table_name = 'run_item' AND column_name IN ('tests_commit', 'case_sha256'))
           OR (table_name = 'perf_run' AND column_name = 'build_no')
        ORDER BY table_name, column_name`,
    );
    expect(r.rows.map((c) => `${c.table_name}.${c.column_name}:${c.is_nullable}`)).toEqual([
      'perf_run.build_no:YES',
      'run_item.case_sha256:YES',
      'run_item.tests_commit:YES',
    ]);
  });

  it('AI 일 종류에 REPORT_RISK 가 있다', async () => {
    const r = await q<{ def: string }>("SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'perf_ai_job_kind_check'");
    expect(r.rows[0]?.def).toContain("'REPORT_RISK'");
  });
});
