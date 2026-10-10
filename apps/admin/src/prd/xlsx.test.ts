import ExcelJS from 'exceljs';
import type { Platform, PrdItem } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import type { 덮는케이스 } from './trace.js';
import { 추적표만들기, type 추적표자료 } from './xlsx.js';

const 항목 = (reqId: string, text: string, status: PrdItem['status'] = 'CONFIRMED'): PrdItem => ({
  reqId,
  feature: '회원가입',
  text,
  basis: [{ from: '기획서.docx', quote: text }],
  status,
});

const 덮음 = (tcId: string, axis: string, techniques: string[] = []): 덮는케이스 => ({ tcId, axis, techniques, platforms: ['desktop'] });

const 자료 = (결과: 추적표자료['결과']): 추적표자료 => ({
  generatedAt: '2026-10-11T03:00:00.000Z',
  items: [항목('MKT-REQ-001', '비밀번호는 8자 이상 20자 이하다 — 예 Mkt!pass99'), 항목('MKT-REQ-003', '약관에 동의해야 가입된다', 'NEEDS_CHECK')],
  cases: {
    'MKT-REQ-001': [
      덮음('MKT-FN-001', '정상', ['동등 분할']),
      덮음('MKT-FN-002', '경계', ['경계값 분석']),
      덮음('MKT-FN-003', '예외', ['경계값 분석']),
      덮음('MKT-UI-001', 'UI'),
    ],
  },
  결과,
});

async function 읽기(파일: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(new Uint8Array(파일).buffer);
  const sheet = wb.getWorksheet('요구사항 추적표')!;
  const 줄 = (n: number) => (sheet.getRow(n).values as unknown[]).slice(1);
  return { sheet, 줄 };
}

describe('추적표만들기', () => {
  it('요구 한 줄에 케이스 수 · 번호 · 종류 · 기법 · 마지막 결과를 싣고 비밀번호를 가린다', async () => {
    const 결과표: Record<string, 'PASS' | 'FAIL'> = { 'MKT-FN-001:desktop': 'PASS', 'MKT-FN-002:desktop': 'FAIL', 'MKT-UI-001:desktop': 'PASS' };
    const { 줄 } = await 읽기(await 추적표만들기(자료((tc: string, p: Platform) => 결과표[`${tc}:${p}`]), ['Mkt!pass99']));
    expect(줄(1)).toEqual(['요구 번호', '기능 묶음', '요구 문장', '상태', '케이스 수', 'TC ID', '정상', '경계', '예외', 'UI', '설계 기법', '마지막 결과']);
    expect(줄(2)).toEqual([
      'MKT-REQ-001',
      '회원가입',
      '비밀번호는 8자 이상 20자 이하다 — 예 ••••••',
      '확정',
      4,
      'MKT-FN-001\nMKT-FN-002\nMKT-FN-003\nMKT-UI-001',
      1,
      1,
      1,
      1,
      '경계값 분석 2 · 동등 분할 1',
      '통과 2 · 실패 1 · 미실행 1',
    ]);
  });

  it('안 덮인 요구는 「안 덮임」에 바탕색을 칠하고 결과 칸을 비운다', async () => {
    const { sheet, 줄 } = await 읽기(await 추적표만들기(자료(() => undefined), []));
    expect(줄(3).slice(0, 10)).toEqual(['MKT-REQ-003', '회원가입', '약관에 동의해야 가입된다', '확인 필요', 0, '안 덮임', 0, 0, 0, 0]);
    expect(줄(3).length).toBe(10);
    expect(sheet.getRow(3).getCell(12).fill).toMatchObject({ fgColor: { argb: 'FFFFF1E4' } });
    expect(sheet.getRow(2).getCell(1).fill).not.toHaveProperty('fgColor');
  });

  it('실행 보기 권한이 없으면 마지막 결과 칸이 빈다', async () => {
    const { 줄 } = await 읽기(await 추적표만들기(자료(null), []));
    expect(줄(2)[11]).toBeUndefined();
    expect(줄(2)[4]).toBe(4);
  });
});
