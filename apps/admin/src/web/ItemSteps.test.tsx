// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { api, type StepResult } from './api.js';
import { Step } from './ItemSteps.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 절차: StepResult = {
  seq: 2,
  title: '토큰을 검증한다',
  status: 'FAIL',
  durationMs: 88,
  line: 19,
  screenshotPath: 'artifacts/runs/1/2/2.png',
  httpTrace: { request: { method: 'GET' }, response: { status: 200 } },
  assertions: [
    { statement: '응답 코드가 정상이다', status: 'PASS', expected: 200, actual: 200 },
    { statement: '토큰이 발급된다', status: 'FAIL', expected: true, actual: false, blocker: true },
    { statement: '유효기간이 3600초다', status: 'NA', expected: 3600, actual: null },
  ],
};

function 그린다(바꿀것: Partial<Parameters<typeof Step>[0]> = {}) {
  return render(<Step step={절차} tcId="ZID-001" runId={1} historyId={2} {...바꿀것} />);
}

describe('절차 부품 (항목 상세 · 실패 카드 공용)', () => {
  it('절차마다 모든 확인의 문장 · 기대 · 실제를 그린다', () => {
    그린다();
    expect(screen.getByText('응답 코드가 정상이다')).toBeTruthy();
    expect(screen.getByText('토큰이 발급된다')).toBeTruthy();
    expect(screen.getByText('유효기간이 3600초다')).toBeTruthy();
    expect(screen.getByText('기대 200')).toBeTruthy();
    expect(screen.getByText('기대 3600')).toBeTruthy();
  });

  it('절차 소요는 다른 화면처럼 초로 적는다', () => {
    그린다();
    expect(screen.getByText('0.09초')).toBeTruthy();
    expect(screen.queryByText('88ms')).toBeNull();
  });

  it('실패 확인에만 assert bad 를, blocker 인 실패에 「뒤 절차 멈춤」을 붙인다', () => {
    const { container } = 그린다();
    expect(container.querySelectorAll('.assert.bad')).toHaveLength(1);
    expect(screen.getAllByText('뒤 절차 멈춤')).toHaveLength(1);
  });

  it('스크린샷은 첫 실패 확인 바로 아래에 두고 lazy 로 읽는다', () => {
    const { container } = 그린다();
    const 실패 = container.querySelector('.assert.bad')!;
    const 다음 = 실패.nextElementSibling!;
    expect(다음.querySelector('img')).toBeTruthy();
    expect(container.querySelector('img')!.getAttribute('loading')).toBe('lazy');
  });

  it('코드 = false 면 스크린샷만 남고 코드 뷰와 요청·응답 원문은 안 나온다', () => {
    vi.spyOn(api, 'source').mockResolvedValue({ lines: [], focus: 19 });
    const { container } = 그린다({ 코드: false });
    expect(container.querySelector('img')).toBeTruthy();
    expect(screen.queryByText('실패 지점 코드')).toBeNull();
    expect(screen.queryByText('요청·응답 원문')).toBeNull();
  });

  it('코드를 숨기지 않으면 코드 뷰와 요청·응답 원문이 나온다', () => {
    그린다();
    expect(screen.getByText('실패 지점 코드')).toBeTruthy();
    expect(screen.getByText('요청·응답 원문')).toBeTruthy();
  });
});

describe('응답 형식 검사 줄', () => {
  const 모양: StepResult = {
    ...절차,
    shapeChecks: [
      { method: 'POST', path: '/v1/pushes', status: 201, result: 'PASS' },
      {
        method: 'GET',
        path: '/v1/pushes/{id}',
        status: 200,
        result: 'FAIL',
        problems: ['필수 필드 없음 — status', '타입이 다름 — total (문서 number · 받은 값 string)'],
      },
      { method: 'DELETE', path: '/v1/pushes/{id}', status: 204, result: 'NO_SHAPE' },
    ],
  };

  it('통과 · 실패(문제 줄 포함) · 문서에 모양 없음을 줄마다 그린다', () => {
    그린다({ step: 모양 });
    expect(screen.getByText('응답 형식 검사')).toBeTruthy();
    const 통과 = screen.getByText('POST /v1/pushes 201').parentElement;
    expect(통과?.textContent).toContain('✓');
    expect(통과?.textContent).toContain('문서와 같습니다');
    const 실패 = screen.getByText('GET /v1/pushes/{id} 200').parentElement;
    expect(실패?.textContent).toContain('✗');
    expect(실패?.textContent).toContain('문서와 다릅니다');
    expect(screen.getByText('· 필수 필드 없음 — status')).toBeTruthy();
    expect(screen.getByText('· 타입이 다름 — total (문서 number · 받은 값 string)')).toBeTruthy();
    const 없음 = screen.getByText('DELETE /v1/pushes/{id} 204').parentElement;
    expect(없음?.textContent).toContain('문서에 응답 형식 없음');
    expect(없음?.textContent).not.toMatch(/[✓✗]/);
  });

  it('shapeChecks 가 비면 블록을 안 그린다', () => {
    그린다({ step: { ...모양, shapeChecks: [] } });
    expect(screen.queryByText('응답 형식 검사')).toBeNull();
  });
});
