import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { renderCatalogXlsx, type ExportCase, type ExportHeld, type ExportInput } from './export.js';

const 로그인: ExportCase = {
  tcId: 'MKT-013',
  name: '로그인하면 홈으로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['테스트 회원 계정이 있다', '홈에 있다'],
  paramSchema: {
    type: 'object',
    properties: {
      username: { type: 'string', description: '테스트 회원 아이디' },
      password: { type: 'string', description: '테스트 회원 비밀번호', default: 'pw1234', secret: true },
      apiToken: { type: 'string', default: 'abc' },
    },
  },
  expectedSchema: {
    type: 'object',
    properties: { url: { type: 'string', description: '가 있을 주소', default: '/' } },
  },
  lastResult: { status: 'PASS', at: '2026-09-29 14:10' },
  filledBy: null,
};

const 미확정: ExportCase = {
  tcId: 'MKT-046',
  name: '잠금 문구가 보인다',
  platforms: [],
  precondition: ['로그인 응답은 가짜 응답(모킹)이다'],
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  unconfirmed: '기획서와 다름',
  lastResult: null,
  filledBy: { rootId: 5877, by: 'maxi' },
  techniques: ['경계값 분석', '결정 테이블'],
};

const 보류들: ExportHeld[] = [
  {
    rootId: 5877,
    held: {
      tcId: 'MKT-040',
      kind: 'UNDECIDABLE',
      reason: '기준 숫자가 없다',
      fields: [{ side: 'params', key: 'count', description: '새로 고침 횟수' }],
    },
    input: { params: { count: 4 }, by: 'maxi', at: '2026-09-29 15:02' },
    merged: true,
  },
  {
    rootId: 5881,
    held: { tcId: 'ORD-012', kind: 'ON_HOLD', reason: '실결제', fields: [] },
    input: null,
    merged: false,
  },
  {
    rootId: 5877,
    held: { tcId: 'MKT-049', kind: 'ON_HOLD', reason: '되돌릴 수 없다', fields: [] },
    input: { removed: true, by: 'maxi', at: '2026-09-29 15:03' },
    merged: true,
  },
];

const 기본: ExportInput = {
  generatedAt: '2026-09-29T06:00:00.000Z',
  cases: [로그인, 미확정],
  held: 보류들,
  canSeeRuns: true,
  canSeeAuthoring: true,
};

async function 읽기(input: ExportInput): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(new Uint8Array(await renderCatalogXlsx(input)).buffer);
  return wb;
}

function 줄(sheet: ExcelJS.Worksheet, n: number): unknown[] {
  return (sheet.getRow(n).values as unknown[]).slice(1);
}

describe('renderCatalogXlsx', () => {
  it('시트 둘에 머리 칸이 있고 머리행이 고정된다', async () => {
    const wb = await 읽기(기본);
    expect(wb.worksheets.map((s) => s.name)).toEqual(['테스트 케이스', '보류 처리 기록']);
    const [케이스, 보류] = wb.worksheets;
    expect(줄(케이스, 1)).toEqual(['TC ID', '케이스명', '기기', '전제', '입력값', '기대값', '상태', '마지막 결과', '설계 기법']);
    expect(줄(보류, 1)).toEqual(['작성 요청', 'TC ID', '구분', '왜 보류됐나', '처리', '넣은 값', '누가', '언제', '반영']);
    expect(케이스.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(wb.created.toISOString()).toBe('2026-09-29T06:00:00.000Z');
  });

  it('케이스 한 줄 — 기기 · 전제 · 비밀값 가림 · 실행 때 넣음 · 마지막 결과', async () => {
    const 케이스 = (await 읽기(기본)).worksheets[0];
    expect(줄(케이스, 2)).toEqual([
      'MKT-013',
      '로그인하면 홈으로 간다',
      'PC · 모바일',
      '테스트 회원 계정이 있다\n홈에 있다',
      '테스트 회원 아이디 = (실행 때 넣음)\n테스트 회원 비밀번호 = ••••\napiToken = ••••',
      '가 있을 주소 = /',
      '정식',
      '통과 · 2026-09-29 14:10',
    ]);
  });

  it('상태 — 미확정 사유 · 모킹 · 사람이 값 채움, 결과 없으면 —', async () => {
    const 케이스 = (await 읽기(기본)).worksheets[0];
    const 셋째 = 줄(케이스, 3);
    expect(셋째[2]).toBe('PC');
    expect(셋째[6]).toBe('미확정 — 기획서와 다름 · 모킹 · 사람이 값 채움 — 작성 요청 #5877 · maxi');
    expect(셋째[7]).toBe('—');
  });

  it('설계 기법은 맨 끝 열 — 기법을 · 로 잇고 없으면 빈칸', async () => {
    const 케이스 = (await 읽기(기본)).worksheets[0];
    expect(케이스.getRow(2).getCell(9).value).toBeNull();
    expect(케이스.getRow(3).getCell(9).value).toBe('경계값 분석 · 결정 테이블');
  });

  it('UI 테스트 목록에서 받으면 설계 기법 열이 없다', async () => {
    const 케이스 = (await 읽기({ ...기본, kind: 'UI' })).worksheets[0];
    expect(줄(케이스, 1)).toEqual(['TC ID', '케이스명', '기기', '전제', '입력값', '기대값', '상태', '마지막 결과']);
    expect(케이스.getRow(3).getCell(9).value).toBeNull();
  });

  it('보류 처리 기록 — 구분 · 처리 · 넣은 값 · 반영', async () => {
    const 보류 = (await 읽기(기본)).worksheets[1];
    expect(줄(보류, 2)).toEqual([
      '#5877', 'MKT-040', '판정 불가', '기준 숫자가 없다', '값 채움', '새로 고침 횟수 = 4', 'maxi', '2026-09-29 15:02', '반영됨',
    ]);
    expect(줄(보류, 3)).toEqual(['#5881', 'ORD-012', '보류', '실결제', '값 필요', '—', '—', '—', '반영 전']);
    expect(줄(보류, 4)[4]).toBe('제거함');
  });

  it('실행 권한이 없으면 마지막 결과를 비운다', async () => {
    const 케이스 = (await 읽기({ ...기본, canSeeRuns: false })).worksheets[0];
    expect(케이스.getRow(2).getCell(8).value).toBeNull();
    expect(케이스.getRow(3).getCell(8).value).toBeNull();
  });

  it('작성 권한이 없으면 사람이 값 채움을 안 붙인다', async () => {
    const 케이스 = (await 읽기({ ...기본, canSeeAuthoring: false, held: null })).worksheets[0];
    expect(케이스.getRow(3).getCell(7).value).toBe('미확정 — 기획서와 다름 · 모킹');
  });

  it('held 가 null 이면 시트 하나', async () => {
    const wb = await 읽기({ ...기본, held: null });
    expect(wb.worksheets.map((s) => s.name)).toEqual(['테스트 케이스']);
  });
});
