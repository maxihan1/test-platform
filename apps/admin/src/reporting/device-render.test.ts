// 증적 머리말 · 엑셀이 앱 항목의 폰 · 앱 판을 그리는지 본다. 순수 함수라 DB 를 쓰지 않는다 (도메인/리포팅 §8.4 · APP-F1-05)

import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { 기기글, type EvidenceDocument, type EvidenceHeader, type EvidenceItem } from './collect.js';
import { 머리말 } from './html.js';
import { renderXlsx } from './xlsx.js';

const 머리: EvidenceHeader = {
  serviceName: '쇼핑 앱',
  testsRepo: 'https://git.example.com/mda-tests',
  title: '앱 회귀',
  kind: '기능 테스트',
  startedAt: '2026-10-19T01:00:00.000Z',
  triggeredByName: '김검수',
  env: 'qa',
  baseUrl: 'http://example.invalid',
};

const 항목 = (device: string | null): EvidenceItem => ({
  tcId: 'MDA-FN-001',
  tcName: '장바구니에 담는다',
  platform: 'android',
  device,
  attempt: 1,
  unconfirmed: null,
  status: 'PASS',
  durationMs: 9000,
  notRunReason: null,
  precondition: [],
  params: [],
  expected: [],
  steps: [],
});

describe('기기글', () => {
  it('못 읽은 칸은 「모름」으로 적는다 — 빈칸이면 없는 판으로 읽힌다', () => {
    expect([기기글({ model: 'SM-G996N', osVersion: '14', appVersion: '1.4.2' }), 기기글({ model: null, osVersion: null, appVersion: null })]).toEqual([
      'SM-G996N · Android 14 · 앱 1.4.2',
      '모델 모름 · Android 판 모름 · 앱 판 모름',
    ]);
  });
});

describe('증적 머리말의 「기기」 줄', () => {
  it('기기가 있으면 「기기」 줄이 선다 — 둘이면 / 로 잇는다', () => {
    const html = 머리말({ ...머리, devices: ['SM-G996N · Android 14 · 앱 1.4.2', 'SM-S918N · Android 15 · 앱 1.4.2'] }, '2026-10-19T02:00:00.000Z').join('\n');
    expect(html).toContain('<dt>기기</dt><dd>SM-G996N · Android 14 · 앱 1.4.2 / SM-S918N · Android 15 · 앱 1.4.2</dd>');
  });

  it('없으면 줄도 없다 — 브라우저 실행 · E2E 증적', () => {
    expect(머리말({ ...머리, devices: [] }, '2026-10-19T02:00:00.000Z').join('\n')).not.toContain('<dt>기기</dt>');
    expect(머리말(머리, '2026-10-19T02:00:00.000Z').join('\n')).not.toContain('<dt>기기</dt>');
  });
});

describe('증적 엑셀의 「기기」 칸', () => {
  it('맨 끝 칸에 그 항목의 기기를 적는다', async () => {
    const doc: EvidenceDocument = { runId: 7, header: 머리, items: [항목('SM-G996N · Android 14 · 앱 1.4.2'), 항목(null)] };
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(await renderXlsx(doc, { generatedAt: '2026-10-19T02:00:00.000Z' })).buffer);
    const ws = wb.worksheets[0]!;
    const 끝 = ws.getRow(1).cellCount;
    expect([ws.getRow(1).getCell(끝).value, ws.getRow(2).getCell(끝).value, ws.getRow(3).getCell(끝).value ?? null]).toEqual([
      '기기',
      'SM-G996N · Android 14 · 앱 1.4.2',
      null,
    ]);
  });
});
