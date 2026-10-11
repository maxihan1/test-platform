// 증적 C 양식 검사 — 요약 띠 → 실패 카드 → 통과 · 미실행 줄 → (PDF 만) 부록 (도메인/리포팅 §8.4)
import { describe, expect, it } from 'vitest';

import type { EvidenceDocument, EvidenceItem } from './collect.js';
import { renderHtml } from './html.js';

const HTML = { generatedAt: '2026-10-12 10:00', format: 'HTML' } as const;
const PDF = { generatedAt: '2026-10-12 10:00', format: 'PDF' } as const;

function 항목(tcId: string, 덮을것: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    tcId,
    tcName: `${tcId} 케이스`,
    platform: 'desktop',
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

function 문서(items: EvidenceItem[]): EvidenceDocument {
  return {
    runId: 11,
    header: {
      serviceName: '커머스',
      testsRepo: 'https://git.example.com/commerce-tests',
      title: '야간 회귀',
      kind: '기능 테스트',
      startedAt: '2026-10-12T00:00:00Z',
      triggeredByName: '김검수',
      env: 'qa',
      baseUrl: 'https://qa.example.com',
    },
    items,
  };
}

const 블록수 = (html: string) => html.match(/<div class="row-k">사전조건<\/div>/g)?.length ?? 0;

const 반복 = [
  항목('AUTH-002', { attempt: 1 }),
  항목('AUTH-002', { attempt: 2, status: 'FAIL' }),
  항목('AUTH-002', { attempt: 3, status: 'FAIL' }),
  항목('AUTH-002', { platform: 'mobile' }),
  항목('AUTH-001'),
  항목('AUTH-003', { status: 'NOT_RUN', durationMs: null, notRunReason: '실행이 멈춰 돌지 못했습니다' }),
];

describe('증적 C 양식', () => {
  it('요약 띠에 통과율 · 실패 N건 · 항목 N건 중 M건 통과가 있다', () => {
    const html = renderHtml(
      문서([항목('A-1'), 항목('A-2', { status: 'FAIL' }), 항목('A-3', { status: 'NOT_RUN', durationMs: null }), 항목('A-4')]),
      HTML,
    );

    expect(html).toContain('<span class="big">50.0%</span>');
    expect(html).toContain('실패 1건');
    expect(html).toContain('항목 4건 중 2건 통과');
  });

  it('항목이 없으면 통과율 자리에 — 와 항목 없음, 카드 자리에 한 줄이다', () => {
    const html = renderHtml(문서([]), HTML);

    expect(html).toContain('<span class="big">—</span>');
    expect(html).toContain('항목 없음');
    expect(html).toContain('실패한 케이스가 없습니다');
  });

  it('실패가 있는 케이스만 카드이고 케이스 번호 차례다 — 나머지는 줄이다', () => {
    const html = renderHtml(문서([항목('B-2', { status: 'FAIL' }), 항목('A-9'), 항목('A-1', { status: 'FAIL' })]), HTML);

    expect(html.match(/<section class="card">/g)).toHaveLength(2);
    expect(html).toContain('실패 케이스 2건');
    expect(html).toContain('통과 · 미실행 케이스 1건');
    const 차례 = ['A-1', 'B-2', 'A-9'].map((id) => html.indexOf(`${id} 케이스`));
    expect(차례).toEqual([...차례].sort((a, b) => a - b));
  });

  it('카드는 깨진 디바이스마다 처음 실패한 회차만 펼치고 「N회 중 M회 실패」를 단다', () => {
    const html = renderHtml(문서(반복), HTML);
    const 카드 = html.slice(html.indexOf('<section class="card">'), html.indexOf('</section>', html.indexOf('<section class="card">')));

    const 펼친머리 = 카드.split('\n').filter((줄) => 줄.includes('class="dev-head"'));
    expect(펼친머리).toHaveLength(1);
    expect(펼친머리[0]).toContain('2회차');
    expect(펼친머리[0]).toContain('3회 중 2회 실패');
    expect(카드.match(/<details class="fold">/g)).toHaveLength(3);
  });

  it('HTML 은 접힌 줄을 그 자리에서 펼친다 — 부록이 없고 모든 회차가 블록으로 남는다', () => {
    const html = renderHtml(문서(반복), HTML);

    expect(블록수(html)).toBe(반복.length);
    expect(html).not.toContain('class="appendix"');
    expect(html).not.toContain('href="#');
  });

  it('PDF 는 접힌 줄이 부록 고리이고 고리마다 부록에 그 자리가 있다 — 모든 회차가 블록으로 남는다', () => {
    const html = renderHtml(문서(반복), PDF);

    expect(html).not.toContain('<details');
    expect(블록수(html)).toBe(반복.length);
    const 고리들 = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]!);
    // 카드의 접힌 줄 셋 + 통과 · 미실행 줄 둘
    expect(고리들).toHaveLength(5);
    const 부록 = html.indexOf('부록 — 접힌 줄의 상세');
    for (const 이름 of 고리들) {
      expect(html.indexOf(`id="${이름}"`)).toBeGreaterThan(부록);
    }
    expect(부록).toBeGreaterThan(html.lastIndexOf('href="#'));
  });

  it('통과 · 미실행 줄은 디바이스마다 판정이고 회차가 여럿이면 통과 수를 적는다 — 사유는 줄에 남는다', () => {
    const html = renderHtml(
      문서([
        항목('C-1', { attempt: 1 }),
        항목('C-1', { attempt: 2 }),
        항목('C-1', { platform: 'mobile', status: 'NOT_RUN', durationMs: null, notRunReason: '러너에 닿지 못했습니다' }),
      ]),
      HTML,
    );
    const 줄 = html.split('\n').find((l) => l.includes('<summary class="fold-line">') && l.includes('C-1 케이스')) ?? '';

    expect(줄).toContain('PC 2/2 통과 · 모바일 미실행');
    expect(줄).toContain('러너에 닿지 못했습니다');
    expect(줄).toContain('<span class="verdict v-na">미실행</span>');
  });
});
