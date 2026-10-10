// 증적 HTML 의 미확정 검사 — 머리 판정 줄 · 묶음 없이 원래 차례 · 블록 머리 사유 (도메인/리포팅 · 실행 §3.2)
import { describe, expect, it } from 'vitest';

import type { EvidenceDocument, EvidenceItem } from './collect.js';
import { renderHtml } from './html.js';

const 옵션 = { generatedAt: '2026-09-26 10:00' };

function 항목(tcId: string, status: EvidenceItem['status'], unconfirmed: string | null = null): EvidenceItem {
  return {
    tcId,
    tcName: `${tcId} 케이스`,
    platform: 'desktop',
    attempt: 1,
    status,
    durationMs: 100,
    notRunReason: null,
    unconfirmed,
    precondition: [],
    params: [],
    expected: [],
    steps: [],
  };
}

function 문서(items: EvidenceItem[]): EvidenceDocument {
  return {
    runId: 9,
    header: {
      serviceName: '결제',
      testsRepo: 'https://github.com/example/pay',
      title: '역방향',
      kind: '기능 테스트',
      startedAt: '2026-09-26T00:00:00Z',
      triggeredByName: '김검수',
      env: 'qa',
      baseUrl: 'https://qa.example.com',
    },
    items,
  };
}

describe('증적 HTML — 미확정', () => {
  it('머리에 판정 줄 — 미확정도 그대로 세고 그중 미확정 N건만 붙는다', () => {
    const 글 = renderHtml(문서([항목('A-1', 'PASS'), 항목('A-2', 'FAIL', '다름 D1')]), 옵션);
    expect(글).toContain('<dt>판정</dt><dd>통과 1 · 실패 1 · 미실행 0 · 그중 미확정 1건</dd>');
  });

  it('미확정 블록도 묶음 없이 원래 차례대로 섞여 있다', () => {
    const 글 = renderHtml(
      문서([항목('A-1', 'PASS'), 항목('A-2', 'FAIL', '다름 D1'), 항목('A-3', 'PASS'), 항목('A-4', 'PASS', '화면에만 D2')]),
      옵션,
    );
    expect(글).not.toContain('기획 답 대기');
    const 차례 = ['A-1', 'A-2', 'A-3', 'A-4'].map((id) => 글.indexOf(`${id} 케이스`));
    expect(차례.every((n) => n > -1)).toBe(true);
    expect(차례).toEqual([...차례].sort((a, b) => a - b));
  });

  it('미확정 블록 머리에 사유 한 문장 — 이스케이프한다', () => {
    const 글 = renderHtml(문서([항목('A-2', 'FAIL', '<b>다름</b> & D1')]), 옵션);
    expect(글).toContain('&lt;b&gt;다름&lt;/b&gt; &amp; D1');
    expect(글).not.toContain('<b>다름</b>');
  });

  it('사유 줄은 판정 색을 입지 않는다 — 미확정은 판정이 아니다', () => {
    const 글 = renderHtml(문서([항목('A-2', 'PASS', '다름 D1')]), 옵션);
    const 줄 = /<div class="([^"]*)">다름 D1<\/div>/.exec(글);
    expect(줄?.[1]).toBe('u-reason');
    expect(글).toMatch(/\.u-reason\{[^}]*color:var\(--ink-muted\)/);
  });
});
