// 증적 PDF · HTML · 엑셀이 테스트 프로시저를 화면과 같은 말로 적는지 본다 — 프로시저 줄 · Blocked 사유 · 후속 케이스 · Blocked 수 (도메인/리포팅 §3.3 「증적 문서 · 엑셀」)
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { 돈항목사유, type EvidenceDocument, type EvidenceItem } from './collect.js';
import { 막힘사유, 막힘을채운다 } from './collectProc.js';
import { renderHtml } from './html.js';
import { 판정줄 } from './summary.js';
import { renderXlsx } from './xlsx.js';

const 프로시저 = (seq: number) => ({ id: 'MTA-TP-022', name: '글쓰기', seq, count: 5 });

function 항목(tcId: string, 덮을것: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    tcId,
    tcName: `${tcId} 케이스`,
    platform: 'android',
    attempt: 1,
    status: 'PASS',
    durationMs: 100,
    notRunReason: null,
    unconfirmed: null,
    precondition: [],
    params: [],
    expected: [],
    steps: [],
    ...덮을것,
  };
}

const 막힘 = (tcId: string, seq: number): EvidenceItem =>
  항목(tcId, { status: 'NA', durationMs: 0, procedure: 프로시저(seq), blocked: { by: 'MTA-FN-278' } });

const 흐름 = 막힘을채운다([
  항목('MTA-FN-276', { procedure: 프로시저(1) }),
  항목('MTA-FN-277', { procedure: 프로시저(2) }),
  항목('MTA-FN-278', { status: 'FAIL', procedure: 프로시저(3) }),
  막힘('MTA-FN-279', 4),
  막힘('MTA-FN-280', 5),
]);

function 문서(items: EvidenceItem[]): EvidenceDocument {
  return {
    runId: 21,
    header: { serviceName: 'Mastodon 앱', testsRepo: 'https://git.example.com/mta', title: '야간', kind: '기능 테스트', startedAt: '2026-11-24T00:00:00Z', triggeredByName: '김검수', env: 'qa', baseUrl: 'https://qa.example.com' },
    items,
  };
}

async function 시트(doc: EvidenceDocument): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await renderXlsx(doc, { generatedAt: '2026-11-24T00:00:00.000Z' }));
  const 행들: string[][] = [];
  wb.getWorksheet('리포트')!.eachRow((row) => 행들.push((row.values as unknown[]).slice(1).map((v) => (v == null ? '' : String(v)))));
  return 행들;
}

describe('Blocked 사유', () => {
  it('막은 케이스가 Fail 이면 「실패」, 판정 없이 끝났으면 「제한 시간 초과」, 통과거나 못 찾으면 번호까지만', () => {
    expect([막힘사유('A-1', 'FAIL'), 막힘사유('A-1', 'NA'), 막힘사유('A-1', 'PASS'), 막힘사유('A-1', undefined)]).toEqual([
      '선행 케이스 A-1 실패',
      '선행 케이스 A-1 제한 시간 초과',
      '선행 케이스 A-1',
      '선행 케이스 A-1',
    ]);
  });

  it('같은 디바이스 · 같은 회차의 막은 케이스로 가르고, 막은 케이스 번호가 없는 Blocked 는 사유가 없다', () => {
    const 다른회차 = 막힘을채운다([항목('B-1', { status: 'FAIL', attempt: 2 }), { ...막힘('B-2', 2), blocked: { by: 'B-1' } }, { ...막힘('B-3', 3), blocked: { by: null } }]);
    expect(다른회차.map((i) => i.notRunReason)).toEqual([null, '선행 케이스 B-1', null]);
    expect(흐름.slice(3).map((i) => i.notRunReason)).toEqual(['선행 케이스 MTA-FN-278 실패', '선행 케이스 MTA-FN-278 실패']);
  });
});

describe('판정을 못 낸 항목의 사유', () => {
  it('Blocked 는 문서가 막은 케이스로 채우니 비우고, 두 꼴의 시간 초과는 「제한 시간 초과」다 — 실행 쪽 한 곳이 가른다', () => {
    expect([
      돈항목사유({ status: 'NA', error: { message: 'BLOCKED' } }, [], []),
      돈항목사유({ status: 'NA', error: { message: 'TIMEOUT' } }, [], []),
      돈항목사유({ status: 'NA', error: { message: 'Test timeout of 120000ms exceeded.' } }, [], []),
    ]).toEqual([null, '제한 시간 초과', '제한 시간 초과']);
  });
});

describe('판정 한 줄', () => {
  it('Blocked 가 있으면 Not tested 뒤에 괄호로, 없으면 안 적는다', () => {
    expect(판정줄(흐름)).toBe('Pass 2 · Fail 1 · Not tested 2 (Blocked 2)');
    expect(판정줄([항목('C-1'), 항목('C-2', { status: 'NA' })])).toBe('Pass 1 · Fail 0 · Not tested 1');
  });
});

describe('증적 HTML', () => {
  const html = renderHtml(문서(흐름), { generatedAt: '2026-11-24', format: 'HTML' });

  it('프로시저 안 케이스의 카드와 줄에 프로시저 번호 · 이름 · 차례가 붙는다', () => {
    expect(html).toContain('<div class="proc-line">MTA-TP-022 글쓰기 · 5건 중 3번째</div>');
    expect(html).toContain('<span class="proc">MTA-TP-022 글쓰기 · 5건 중 4번째</span>');
  });

  it('막은 케이스의 실패 카드 끝에 후속 케이스 줄이 선다', () => {
    expect(html).toContain('<span class="verdict v-na">Blocked</span>후속 케이스 MTA-FN-279 · MTA-FN-280</div>');
  });

  it('Blocked 케이스는 실패 카드가 아니라 줄에 서고 배지가 「Blocked」 · 사유가 막은 케이스다', () => {
    const 카드 = html.slice(html.indexOf('<h2 class="sec">Fail 케이스'), html.indexOf('<h2 class="sec">Pass · Not tested'));
    expect(카드).not.toContain('MTA-FN-279 케이스');
    expect(html).toMatch(/<span class="verdict v-na">Blocked<\/span><span class="tc-id">MTA-FN-279<\/span>.*Android 앱 Blocked.*선행 케이스 MTA-FN-278 실패/);
  });

  it('옛 꼴 케이스만 든 문서에는 프로시저 줄 · 후속 줄이 없다', () => {
    const 옛 = renderHtml(문서([항목('D-1', { status: 'FAIL' }), 항목('D-2')]), { generatedAt: '2026-11-24', format: 'PDF' });
    expect(옛.slice(옛.indexOf('<body>'))).not.toMatch(/proc-line|class="proc"|blocked-next|Blocked/);
  });
});

describe('증적 엑셀', () => {
  it('Blocked 줄은 판정 Not tested · 사유 칸에 「Blocked 선행 케이스 …」이고 맨 끝 프로시저 칸에 번호 · 차례', async () => {
    const [머리, ...행들] = await 시트(문서(흐름));
    const 칸 = (이름: string) => 머리!.indexOf(이름);
    expect(머리!.at(-1)).toBe('프로시저');
    const 막힌 = 행들.find((r) => r[칸('tcId')] === 'MTA-FN-279')!;
    expect([막힌[칸('판정')], 막힌[칸('Not tested·판정불가 사유')], 막힌[칸('프로시저')]]).toEqual(['Not tested', 'Blocked 선행 케이스 MTA-FN-278 실패', 'MTA-TP-022 · 5건 중 4번째']);
  });

  it('프로시저 안 케이스가 없는 실행은 프로시저 칸이 서지 않는다', async () => {
    const [머리] = await 시트(문서([항목('E-1')]));
    expect(머리!.at(-1)).toBe('다시 실행');
  });
});
