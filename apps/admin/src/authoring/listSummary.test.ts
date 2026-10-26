// 작성 목록 줄 summary — 종류 · 무슨 테스트 · 결과 · 시작한 곳 검사 (SPEC 도메인/작성 §3.6 「작성 목록 줄」 · §7 「목록 줄 summary」 · WEB-F6-06)

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 목록요약들 } from './listSummary.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWB';

const 항목 = (번호: number, feature: string, text: string, 화면?: string) => ({
  reqId: `XWB-REQ-${String(번호).padStart(3, '0')}`,
  feature,
  text,
  basis: [화면 === undefined ? { from: '기획서.docx', quote: text } : { from: '화면', ref: 화면, quote: text }],
  status: 'CONFIRMED',
});
const 케이스 = (번호: number, change: 'NEW' | 'CHANGED', reqs: number[]) => ({
  tcId: `XWB-FN-${String(번호).padStart(3, '0')}`,
  name: `케이스 ${String(번호)}`,
  file: 'tests/xwb/a.spec.ts',
  change,
  verifies: ['보인다'],
  reqs: reqs.map((n) => `XWB-REQ-${String(n).padStart(3, '0')}`),
});
const 보류 = {
  tcId: 'XWB-FN-002',
  name: '쿠폰 적용',
  file: 'tests/xwb/a.spec.ts',
  kind: 'ON_HOLD',
  reason: '쿠폰 번호가 필요',
  fields: [{ side: 'params', key: 'coupon', description: '쿠폰 번호', type: 'string' }],
};

describe.skipIf(연결 === undefined)('작성 목록 summary', () => {
  let 서비스 = 0;

  async function 판(version: number, items: object[]): Promise<void> {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, $2, $3, 9, 'PERSON', 'xwb', '검사')`,
      [서비스, version, JSON.stringify(items)],
    );
  }

  async function 행(칸: {
    kind?: string; sourceId?: number; status: string; params?: object; result?: object; prdVersion?: number;
    stage?: string; compare?: boolean; startedAt?: string | null; finishedAt?: string; continueFrom?: number;
  }): Promise<number> {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status, claimed_by, result,
                                      prd_version, stage, compare, env, started_at, finished_at, continue_from, stop_reason, stopped_by)
       VALUES ($1, $2, $3, $4, 'xwb', '목록 검사', $5, CASE WHEN $5 = 'PENDING' THEN NULL ELSE 'xwb' END, $6, $7, $8, $9,
               CASE WHEN $9 THEN 'qa' ELSE NULL END, $10, $11, $12,
               CASE WHEN $5 = 'STOPPED' THEN 'USER' ELSE NULL END, CASE WHEN $5 = 'STOPPED' THEN 'xwb' ELSE NULL END)
       RETURNING id`,
      [서비스, 칸.kind ?? 'AUTHOR', 칸.sourceId ?? null, JSON.stringify(칸.params ?? {}), 칸.status,
        칸.result === undefined ? null : JSON.stringify(칸.result), 칸.prdVersion ?? null, 칸.stage ?? null, 칸.compare ?? false,
        칸.startedAt !== undefined ? 칸.startedAt : 칸.status === 'PENDING' ? null : '2026-10-26T01:00:00Z', 칸.finishedAt ?? null, 칸.continueFrom ?? null],
    );
    return Number(r.rows[0]!.id);
  }

  async function 자료(id: number, 이름: string, 자리: number, figma = false): Promise<void> {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO authoring_asset (request_id, position, kind, name, figma_url, size, role) VALUES ($1, $2, $3, $4, $5, $6, 'INPUT')`,
      [id, 자리, figma ? 'FIGMA' : 'FILE', 이름, figma ? 이름 : null, figma ? null : 10],
    );
  }

  async function 치우기(): Promise<void> {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM screen_record WHERE service_id = $1', [서비스]);
    await pool.query('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  }

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', 'https://github.com/acme/xwb', 'xwb')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 작성 목록 요약 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
  });

  beforeEach(치우기);

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await 치우기();
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('기획서로 작성 — 만든 케이스에 달린 요구의 기능 묶음 많은 차례 셋 · 결과 셈 · 자료 다섯까지', async () => {
    await 판(1, [항목(1, '회원가입', '가'), 항목(2, '회원가입', '나'), 항목(3, '홈', '다'), 항목(4, '공통', '라'), 항목(5, '결제', '마'), 항목(6, '회원가입', '바')]);
    const 뿌리 = await 행({
      status: 'DONE', prdVersion: 1,
      result: {
        cases: [케이스(1, 'NEW', [1, 2]), 케이스(2, 'NEW', [6, 3]), 케이스(3, 'CHANGED', [4, 5])],
        coverage: { total: 7, cased: 6, held: 0, excluded: {}, missing: ['XWB-REQ-007'], later: [] },
        held: [보류],
      },
    });
    for (const [i, 이름] of ['기획서.docx', 'https://www.figma.com/design/abc', 'b.pdf', 'c.pdf', 'd.pdf', 'e.pdf', 'f.pdf'].entries()) {
      await 자료(뿌리, 이름, i + 1, 이름.startsWith('https://'));
    }
    const 요약 = (await 목록요약들(서비스, [뿌리])).get(뿌리)!;
    expect(요약.kind).toBe('PRD');
    expect(요약.what.features).toEqual(['회원가입', '홈', '공통']);
    expect(요약.what.featuresMore).toBe(1);
    expect(요약.result).toEqual({ casesMade: 2, casesFixed: 1, reqsCovered: 6, reqsTotal: 7, held: 1, stoppedAt: null });
    expect(요약.from.by).toBe('PERSON');
    expect(요약.from.assets).toEqual([
      { name: '기획서.docx', figma: false },
      { name: 'https://www.figma.com/design/abc', figma: true },
      { name: 'b.pdf', figma: false },
      { name: 'c.pdf', figma: false },
      { name: 'd.pdf', figma: false },
    ]);
    expect(요약.from.assetsMore).toBe(2);

    // 다시 돌린 실행이 최신이면 그 실행의 셈을 본다 — 도는 중이라 결과도 기능 묶음도 모른다
    await 행({ kind: 'RERUN', sourceId: 뿌리, status: 'RUNNING', stage: '케이스를 만드는 중' });
    const 다시 = (await 목록요약들(서비스, [뿌리])).get(뿌리)!;
    expect(다시.result).toBeNull();
    expect(다시.what.features).toEqual([]);
  });

  it('반영 요청 — 시작하기 직전 기준 판과 견준 바뀐 요구 수 · 멈춘 단계 · 화면이 맞음 번호는 따로', async () => {
    await 판(1, [항목(1, '회원가입', '8자 이상'), 항목(2, '홈', '배너'), 항목(3, '공통', '머리')]);
    await 판(2, [항목(1, '회원가입', '10자 이상'), 항목(2, '홈', '배너 둘'), 항목(3, '공통', '머리'), 항목(4, '결제', '새 요구')]);
    const 첫작성 = await 행({ status: 'DONE', prdVersion: 1, finishedAt: '2026-10-26T00:00:00Z' });
    await 행({ kind: 'MERGE', sourceId: 첫작성, status: 'DONE', finishedAt: '2026-10-26T00:30:00Z' });

    const 반영 = await 행({ status: 'STOPPED', params: { prdApply: true }, prdVersion: 2, stage: '케이스를 만드는 중', startedAt: '2026-10-26T01:00:00Z' });
    const 결정 = await 행({
      status: 'RUNNING', prdVersion: 2, startedAt: '2026-10-26T01:00:00Z',
      params: { prdApply: true, decision: { after: [], count: 3 }, screenRight: [{ runId: 1, tcId: 'XWB-FN-001', reqIds: ['XWB-REQ-002'] }] },
    });
    // 기준 판보다 먼저 시작한 반영은 그때의 기준이 없다 — 판 2 의 요구가 모두 새 것이다
    const 앞선 = await 행({ status: 'FAILED', params: { prdApply: true }, prdVersion: 2, startedAt: '2026-10-25T23:00:00Z' });
    // 집히기 전에 멈춘 요청은 단계 글 대신 빈 글 — 화면이 「시작 전에 멈춤」으로 옮긴다
    const 시작전 = await 행({ status: 'STOPPED', params: { prdApply: true }, startedAt: null });

    const 표 = await 목록요약들(서비스, [반영, 결정, 앞선, 시작전]);
    expect(표.get(반영)!.kind).toBe('PRD_APPLY');
    expect(표.get(반영)!.what.reqs).toBe(3);
    expect(표.get(반영)!.from.by).toBe('PRD');
    expect(표.get(반영)!.result).toEqual({ casesMade: null, casesFixed: null, reqsCovered: null, reqsTotal: null, held: null, stoppedAt: '케이스를 만드는 중' });

    expect(표.get(결정)!.kind).toBe('DECISION');
    expect(표.get(결정)!.what).toMatchObject({ reqs: 2, screenRight: 1 });
    expect(표.get(결정)!.from).toMatchObject({ by: 'DECISION', decisions: 3 });

    expect(표.get(앞선)!.what.reqs).toBe(4);
    expect(표.get(앞선)!.result?.stoppedAt).toBe('준비');
    expect(표.get(시작전)!.result?.stoppedAt).toBe('');
    expect(표.get(시작전)!.what.reqs).toBe(0);
  });

  it('기획서에 없는 화면 — 화면 근거 주소를 화면 기록 이름으로 · 서버가 시작 · 앞 뿌리 번호', async () => {
    await 판(1, [항목(1, '이용약관', '약관', '/terms'), 항목(2, '이용약관', '약관 둘', '/terms'), 항목(3, '개인정보', '처리방침', '/privacy')]);
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO screen_record (service_id, env, state, url, name, text_fp, struct_fp, record, crawled_at)
       VALUES ($1, 'qa', '로그아웃', '/terms', '이용약관', 'a', 'b', '# 기록', now())`,
      [서비스],
    );
    const 앞 = await 행({ status: 'DONE', compare: true });
    const 밖 = await 행({ status: 'DONE', compare: true, params: { uncoveredOf: 앞 }, prdVersion: 1, result: { cases: [케이스(1, 'NEW', [1, 2]), 케이스(2, 'NEW', [3])] } });
    const 화면만 = await 행({ status: 'PENDING', compare: true });
    const 이어 = await 행({ status: 'PENDING', continueFrom: 앞 });

    const 표 = await 목록요약들(서비스, [밖, 화면만, 이어]);
    expect(표.get(밖)!.kind).toBe('UNCOVERED');
    expect(표.get(밖)!.what.screens).toEqual(['이용약관', '/privacy']);
    expect(표.get(밖)!.from).toMatchObject({ by: 'AUTO', after: 앞 });
    expect(표.get(밖)!.result?.casesMade).toBe(2);
    expect(표.get(화면만)!.kind).toBe('SCREEN_ONLY');
    expect(표.get(화면만)!.result).toBeNull();
    expect(표.get(이어)!.kind).toBe('CONTINUE');
    expect(표.get(이어)!.from).toMatchObject({ by: 'PERSON', after: 앞 });
  });

  it('케이스 고치기 — 번호 셋과 나머지 · 고친 것 · 끝나면 고친 수', async () => {
    const 기대 = await 행({
      kind: 'EDIT', status: 'DONE',
      params: { edits: ['001', '002', '003', '004'].map((n) => ({ tcId: `XWB-FN-${n}`, expected: { title: '홈' } })) },
    });
    const 지움 = await 행({ kind: 'EDIT', status: 'RUNNING', params: { edits: [{ tcId: 'XWB-FN-009', delete: true }] } });
    const 섞임 = await 행({ kind: 'EDIT', status: 'FAILED', stage: '케이스를 고치는 중', params: { edits: [{ tcId: 'XWB-FN-008', delete: true }, { tcId: 'XWB-FN-007', expected: { a: 1 } }] } });

    const 표 = await 목록요약들(서비스, [기대, 지움, 섞임]);
    expect(표.get(기대)!.kind).toBe('EDIT');
    expect(표.get(기대)!.what).toMatchObject({ tcIds: ['XWB-FN-001', 'XWB-FN-002', 'XWB-FN-003'], tcMore: 1, fix: 'EXPECTED' });
    expect(표.get(기대)!.result).toMatchObject({ casesFixed: 4, casesMade: null });
    expect(표.get(기대)!.from.by).toBe('CASES');
    expect(표.get(지움)!.what.fix).toBe('DELETE');
    expect(표.get(섞임)!.what.fix).toBeNull();
    expect(표.get(섞임)!.result).toMatchObject({ casesFixed: null, stoppedAt: '케이스를 고치는 중' });
  });
});
