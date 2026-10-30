// 한 건 실행이 붙은 실행의 증적 — 지금 결과 + 원래 결과가 HTML · PDF · 엑셀에 어떻게 서는지 본다. 순수 함수라 DB 를 쓰지 않는다

import ExcelJS, { type Worksheet } from 'exceljs';
import { describe, expect, it } from 'vitest';

import type { EvidenceDocument, EvidenceItem } from './collect.js';
import { renderHtml } from './html.js';
import { renderXlsx } from './xlsx.js';

const 머리 = {
  serviceName: '커머스',
  testsRepo: 'https://git.example.com/commerce-tests',
  title: '야간 회귀',
  kind: '기능 테스트',
  startedAt: '2026-10-29T22:00:00.000Z',
  triggeredByName: '김검수',
  env: 'qa',
  baseUrl: 'https://qa.example.com',
};

function 항목(tcId: string, 덮을것: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    tcId,
    tcName: `${tcId} 이름`,
    platform: 'desktop',
    attempt: 1,
    unconfirmed: null,
    status: 'PASS',
    durationMs: 100,
    notRunReason: null,
    precondition: [],
    params: [],
    expected: [],
    steps: [{ seq: 1, title: '절차 하나', status: 'PASS', durationMs: 10, screenshotPath: null, assertions: [] }],
    ...덮을것,
  };
}

const 덮음 = (처음: EvidenceItem['status'], 끝난때: string): EvidenceItem['rerun'] => ({
  finishedAt: 끝난때,
  triggeredBy: '다시 돌린 사람',
  original: 항목('XDZ-001', { status: 처음, steps: [{ seq: 1, title: '처음 절차', status: 'FAIL', durationMs: 5, screenshotPath: null, assertions: [] }] }),
});

const 문서 = (items: EvidenceItem[]): EvidenceDocument => ({ runId: 7, header: 머리, items });
const 옵션 = { generatedAt: '2026-10-30T00:00:00.000Z' };

describe('한 건 실행이 붙은 실행의 증적 HTML', () => {
  const 덮인 = 항목('XDZ-001', { rerun: 덮음('FAIL', '2026-10-30T01:00:00.000Z') });
  const 문서들 = 문서([덮인, 항목('XDZ-002', { rerun: 덮음('FAIL', '2026-10-30T03:00:00.000Z') }), 항목('XDZ-003')]);

  it('판정 한 줄 끝에 다시 실행 건수와 가장 늦은 시각이 붙고 수는 지금 결과다', () => {
    const html = renderHtml(문서들, { ...옵션, format: 'HTML' });
    expect(html).toContain('통과 3 · 실패 0 · 미실행 0 · 다시 실행 2건 포함 · 마지막 2026-10-30T03:00:00.000Z');
  });

  it('덮인 항목이 없으면 꼬리도 다시 실행 문구도 없다', () => {
    const html = renderHtml(문서([항목('XDZ-003')]), { ...옵션, format: 'HTML' });
    expect(html).not.toContain('다시 실행');
    expect(html).not.toContain('원래 결과');
  });

  it('블록 머리에 다시 실행 · 시각 · 실행자 · 원래 결과 판정이 서고 HTML 은 원래 결과를 그 자리에 펼친다', () => {
    const html = renderHtml(문서들, { ...옵션, format: 'HTML' });
    expect(html).toContain('다시 실행 · 2026-10-30T01:00:00.000Z · 다시 돌린 사람 · 원래 결과 실패');
    expect(html).toContain('<summary class="fold-line"><span class="tc-name">원래 결과</span>');
    expect(html).toContain('처음 절차');
    expect(html).not.toContain('부록 — 원래 결과');
  });

  it('PDF 는 원래 결과를 부록으로 건다', () => {
    const html = renderHtml(문서들, { ...옵션, format: 'PDF' });
    expect(html).toContain('<h2 class="sec">부록 — 원래 결과</h2>');
    expect(html).toContain('id="o-0"');
    expect(html).toContain('href="#o-0"');
    expect(html).toContain('처음 절차');
  });
});

describe('한 건 실행이 붙은 실행의 증적 엑셀', () => {
  async function 편다(doc: EvidenceDocument): Promise<Worksheet> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(await renderXlsx(doc, 옵션)).buffer);
    return wb.worksheets[0]!;
  }

  it('덮인 디바이스는 원래 항목 행과 다시 돈 항목 행을 둘 다 펴고 맨 끝 칸으로 가른다', async () => {
    const ws = await 편다(문서([항목('XDZ-001', { rerun: 덮음('FAIL', '2026-10-30T01:00:00.000Z') }), 항목('XDZ-002')]));
    const 끝 = ws.getRow(1).cellCount;
    const 줄 = [2, 3, 4].map((행) => [ws.getRow(행).getCell(1).value, ws.getRow(행).getCell(7).value, ws.getRow(행).getCell(11).value, ws.getRow(행).getCell(끝).value ?? null]);
    expect(ws.getRow(1).getCell(끝).value).toBe('다시 실행');
    expect(줄).toEqual([
      [7, 'XDZ-001', '실패', '원래 결과'],
      [7, 'XDZ-001', '통과', '다시 실행 · 2026-10-30T01:00:00.000Z · 다시 돌린 사람'],
      [7, 'XDZ-002', '통과', null],
    ]);
    expect(ws.getRow(2).getCell(19).value).toBe('처음 절차');
    expect(ws.getRow(3).getCell(19).value).toBe('절차 하나');
  });
});
