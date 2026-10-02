// 보류 케이스 사람 입력 검사 — 값 검사 · 남은 수 · 옮기기 · held_input 저장 (SPEC 도메인/작성 §3.6 「★ 보류 케이스」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  남은수,
  입력검사,
  입력넣기,
  입력옮기기,
  입력읽기,
  입력지우기,
  tcId인가,
  type 보류,
  type 보류입력,
} from './held.js';

const 쿠폰: 보류 = {
  tcId: 'XWL-001',
  file: 'tests/xwl/coupon.spec.ts',
  kind: 'UNDECIDABLE',
  reason: '판정 불가 — 최종 금액 기준이 없다',
  fields: [
    { side: 'params', key: 'wait', description: '대기 초', type: 'number' },
    { side: 'expected', key: 'total', description: '최종 금액', type: 'number' },
    { side: 'expected', key: 'grade', description: '등급', type: 'enum', options: ['A', 'B'] },
  ],
};
const 날짜칸만: 보류 = { tcId: 'XWL-002', file: 'tests/xwl/date.spec.ts', kind: 'ON_HOLD', reason: '보류 — 날짜', fields: [] };
const 누가 = { by: 'xwl1', at: '2026-09-29T00:00:00.000Z' };

describe('입력검사', () => {
  it('맞는 값이면 그대로 돌려준다', () => {
    expect(입력검사(쿠폰, { params: { wait: 3 }, expected: { grade: 'A' } })).toEqual({ params: { wait: 3 }, expected: { grade: 'A' } });
    expect(입력검사(쿠폰, { removed: true })).toEqual({ removed: true });
    expect(입력검사(날짜칸만, { removed: true })).toEqual({ removed: true });
  });

  it.each([
    ['모르는 칸', { params: { nope: 1 } }],
    ['다른 쪽 칸', { expected: { wait: 1 } }],
    ['숫자 칸에 글자', { params: { wait: '3' } }],
    ['숫자 칸에 NaN', { params: { wait: Number.NaN } }],
    ['선택지 밖', { expected: { grade: 'C' } }],
    ['빈 입력', {}],
    ['값과 제거를 같이', { params: { wait: 3 }, removed: true }],
    ['removed 가 true 가 아님', { removed: false }],
    ['모르는 뿌리 키', { params: { wait: 3 }, by: 'x' }],
    ['객체가 아님', 'x'],
    ['칸 묶음이 객체가 아님', { params: [3] }],
  ])('%s 이면 글로 된 까닭', (_이름, 넣을것) => {
    expect(typeof 입력검사(쿠폰, 넣을것)).toBe('string');
  });

  it('fields 가 빈 케이스는 제거만 된다', () => {
    expect(typeof 입력검사(날짜칸만, { params: { any: 1 } })).toBe('string');
  });

  it('글자·참거짓 칸', () => {
    const 칸들: 보류 = {
      ...쿠폰,
      fields: [
        { side: 'params', key: 'name', description: '이름', type: 'string' },
        { side: 'params', key: 'on', description: '켬', type: 'boolean' },
      ],
    };
    expect(입력검사(칸들, { params: { name: '가', on: false } })).toEqual({ params: { name: '가', on: false } });
    expect(typeof 입력검사(칸들, { params: { on: 'true' } })).toBe('string');
    expect(typeof 입력검사(칸들, { params: { name: 1 } })).toBe('string');
  });
});

describe('tcId인가', () => {
  it('종류 글자가 붙은 tcId 도 받는다', () => {
    expect(tcId인가('PAY-UI-001')).toBe(true);
  });
});

describe('남은수', () => {
  it('제거했거나 모든 칸이 찬 케이스만 끝난 것으로 센다', () => {
    const 입력: 보류입력 = {
      'XWL-001': { params: { wait: 3 }, expected: { total: 100 }, ...누가 },
    };
    expect(남은수([쿠폰, 날짜칸만], 입력)).toBe(2);
    expect(남은수([쿠폰, 날짜칸만], { ...입력, 'XWL-002': { removed: true, ...누가 } })).toBe(1);
    expect(
      남은수([쿠폰, 날짜칸만], {
        'XWL-001': { params: { wait: 3 }, expected: { total: 100, grade: 'B' }, ...누가 },
        'XWL-002': { removed: true, ...누가 },
      }),
    ).toBe(0);
    expect(남은수([쿠폰], null)).toBe(1);
    expect(남은수([], null)).toBe(0);
  });
});

describe('입력옮기기', () => {
  it('같은 tcId · 같은 쪽 · 같은 칸 이름만 남기고 나머지는 버린다', () => {
    const 새쿠폰: 보류 = {
      ...쿠폰,
      fields: [
        { side: 'params', key: 'wait', description: '대기 초', type: 'number' },
        { side: 'params', key: 'total', description: '옮겨 간 칸', type: 'number' },
      ],
    };
    const 옛: 보류입력 = {
      'XWL-001': { params: { wait: 3 }, expected: { total: 100, grade: 'A' }, ...누가 },
      'XWL-009': { params: { wait: 1 }, ...누가 },
    };
    expect(입력옮기기(옛, [새쿠폰])).toEqual({ 'XWL-001': { params: { wait: 3 }, ...누가 } });
  });

  it('제거 표시는 그 tcId 가 새 결과에도 보류로 있으면 옮긴다', () => {
    const 옛: 보류입력 = { 'XWL-002': { removed: true, ...누가 }, 'XWL-003': { removed: true, ...누가 } };
    expect(입력옮기기(옛, [날짜칸만])).toEqual({ 'XWL-002': { removed: true, ...누가 } });
  });

  it('칸 타입이 바뀌어 값이 안 맞으면 버리고, 남는 것이 없으면 null', () => {
    const 글자로: 보류 = { ...쿠폰, fields: [{ side: 'params', key: 'wait', description: '대기', type: 'string' }] };
    expect(입력옮기기({ 'XWL-001': { params: { wait: 3 }, ...누가 } }, [글자로])).toBeNull();
    expect(입력옮기기(null, [쿠폰])).toBeNull();
  });
});

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWL';

describe.skipIf(연결 === undefined)('held_input 저장', () => {
  let 서비스 = 0;
  let 요청번호 = 0;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', 'https://github.com/acme/xwl', 'xwl')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 보류 입력 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, requested_by, requested_by_name, status, claimed_by, started_at, finished_at)
       VALUES ($1, 'AUTHOR', 'xwl1', '보류 입력 검사', 'DONE', 'xwl-에이전트', now() - interval '1 hour', now())
       RETURNING id`,
      [서비스],
    );
    요청번호 = Number(r.rows[0]!.id);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('넣기는 그 tcId 를 통째로 바꾸고 by·at 을 붙이며, 지우기는 그 tcId 만 빼고 비면 NULL', async () => {
    expect(await 입력읽기(요청번호)).toEqual({});

    await 입력넣기(요청번호, 'XWL-001', { params: { wait: 3 } }, 'xwl1');
    await 입력넣기(요청번호, 'XWL-002', { removed: true }, 'xwl2');
    await 입력넣기(요청번호, 'XWL-001', { expected: { total: 100 } }, 'xwl3');

    const 읽음 = await 입력읽기(요청번호);
    expect(Object.keys(읽음).sort()).toEqual(['XWL-001', 'XWL-002']);
    expect(읽음['XWL-001']).toMatchObject({ expected: { total: 100 }, by: 'xwl3' });
    expect(읽음['XWL-001']!.params).toBeUndefined();
    expect(Number.isNaN(Date.parse(읽음['XWL-001']!.at))).toBe(false);
    expect(읽음['XWL-002']).toMatchObject({ removed: true, by: 'xwl2' });

    await 입력지우기(요청번호, 'XWL-001');
    expect(Object.keys(await 입력읽기(요청번호))).toEqual(['XWL-002']);

    await 입력지우기(요청번호, 'XWL-002');
    const { pool } = await import('../db/index.js');
    const 칸 = await pool.query<{ held_input: unknown }>('SELECT held_input FROM authoring_request WHERE id = $1', [요청번호]);
    expect(칸.rows[0]!.held_input).toBeNull();
  });
});
