// @vitest-environment jsdom
// E2E 실행 결과 화면 검사 (도메인/시나리오 §8.11 · 실행 §8.7). 머리 · 정보 칸 · 단계 줄 · 다시 묻기를 본다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { scenarioApi, type ScenarioRunPart, type ScenarioRunResult } from './scenarioApi.js';
import { ScenarioResult } from './ScenarioResult.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const 사진길 = (seq: number) => `/api/runs/77/scenario/screenshots/${seq}`;

function 부품(seq: number, 덮: Partial<ScenarioRunPart>): ScenarioRunPart {
  return {
    seq,
    kind: 'case',
    tcId: `XSX-00${seq}`,
    tcName: `케이스 ${seq}`,
    part: { kind: 'case', tcId: `XSX-00${seq}`, params: {}, expected: {}, skipSteps: [] },
    status: 'PASS',
    durationMs: 500,
    skippedSteps: [],
    mocks: [],
    paramSchema: null,
    expectedSchema: null,
    precondition: [],
    unconfirmed: null,
    bound: {},
    cleanup: [],
    steps: [],
    error: null,
    ...덮,
  };
}

const 로그인 = 부품(1, {
  tcName: '로그인 확인',
  part: { kind: 'case', tcId: 'XSX-001', params: { id: 'kim', password: 'hunter2' }, expected: {}, skipSteps: [], carryOver: false },
  paramSchema: { type: 'object', properties: { id: { description: '아이디' }, password: { description: '비밀번호', secret: true } } },
  steps: [{ seq: 1, title: '로그인', status: 'PASS', durationMs: 100, assertions: [] }],
});
const 모킹켜기 = 부품(2, {
  kind: 'mock', tcId: null, tcName: null,
  part: { kind: 'mock', urlPattern: '**/api/pay', status: 500, contentType: 'application/json', body: '{}' },
});
const 결제 = 부품(3, {
  tcName: '결제 확인',
  part: {
    kind: 'case', tcId: 'XSX-003', params: {}, expected: {}, skipSteps: ['로그인'],
    links: [{ kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/orders', jsonPath: '$.id' } }],
  },
  status: 'FAIL',
  mocks: ['**/api/pay'],
  skippedSteps: ['로그인'],
  bound: { orderId: 812 },
  unconfirmed: '화면에서 읽은 값입니다',
  cleanup: [{ method: 'DELETE', url: '/api/orders/812', status: 204 }, { method: 'DELETE', url: '/api/x', error: 'ECONNRESET' }],
  steps: [
    { seq: 4, title: '결제 화면 열기', status: 'PASS', durationMs: 10, assertions: [] },
    { seq: 5, title: '결제 버튼 누르기', status: 'FAIL', durationMs: 10, assertions: [] },
  ],
  error: { message: '기대와 다릅니다\n둘째 줄' },
});
const 안돈 = 부품(4, {
  kind: 'api', tcId: null, tcName: null,
  part: { kind: 'api', method: 'GET', path: '/api/orders', expectStatus: 200 },
  status: 'NA', durationMs: null, error: { message: 'NOT_RUN' },
});

function 결과(덮: Partial<ScenarioRunResult> = {}): ScenarioRunResult {
  return {
    scenarioId: 12, version: 3, status: 'FINISHED', platform: 'desktop', title: '결제 시나리오',
    env: 'qa', baseUrl: 'https://qa.example.com', triggeredBy: 'kim', triggeredByName: '김검사',
    startedAt: '2026-10-06T00:00:00.000Z', finishedAt: '2026-10-06T00:00:12.000Z',
    parts: [로그인, 모킹켜기, 결제, 안돈], ...덮,
  };
}

function 연다(답: ScenarioRunResult, 상자안 = false) {
  const 부름 = vi.spyOn(scenarioApi, 'result').mockResolvedValue(답);
  render(<ScenarioResult runId={77} 상자안={상자안} />);
  return 부름;
}

const 줄 = (이름: string) => screen.getByText(이름).closest('.scn-part') as HTMLElement;

describe('머리', () => {
  it('제목 · 부제 · 시나리오 고리 · 뒤로 고리', async () => {
    연다(결과());
    expect((await screen.findByRole('heading', { name: '결제 시나리오' })).textContent).toBe('결제 시나리오');
    expect(screen.getByText('E2E · 시나리오 v3 · PC')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'SC-12' }).getAttribute('href')).toBe('#/scenarios/12');
    expect(screen.getByRole('link', { name: '← 실행 기록 › E2E' }).getAttribute('href')).toBe('#/runs/e2e');
  });

  it('상자 안에서는 뒤로 고리가 없다', async () => {
    연다(결과(), true);
    await screen.findByText('단계별 결과');
    expect(screen.queryByRole('link', { name: '← 실행 기록 › E2E' })).toBeNull();
  });

  it('실패는 판정 배지 · 증적 버튼은 없다', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    expect(document.querySelector('.head .verdict')?.textContent).toBe('실패');
    expect(screen.queryByText('E2E 증적 받기')).toBeNull();
  });

  it('통과인데 미확정이 섞이면 통과 · 미확정 포함 칩', async () => {
    연다(결과({ parts: [부품(1, { unconfirmed: '사유' })] }));
    await screen.findByText('단계별 결과');
    const 칩 = document.querySelector('.head .case-tag');
    expect(칩?.textContent).toBe('통과 · 미확정 포함');
    expect(document.querySelector('.head .verdict')).toBeNull();
  });

  it('도는 중이어도 미확정 단계가 있으면 머리에 미확정 포함 칩이 뜬다', async () => {
    연다(결과({ status: 'RUNNING', finishedAt: null, parts: [부품(1, { unconfirmed: '사유' }), 안돈] }));
    await screen.findByText('단계별 결과');
    expect(document.querySelector('.head .verdict')).toBeNull();
    expect(document.querySelector('.head .case-tag')?.textContent).toBe('미확정 포함');
  });

  it('값 주입 줄은 비밀 칸에 꽂힌 값을 서버가 안 가려 보내도 화면이 가린다', async () => {
    const 비밀주입 = 부품(1, {
      part: {
        kind: 'case', tcId: 'XSX-001', params: {}, expected: {}, skipSteps: [],
        links: [{ kind: 'bind', param: 'password', value: { fromSeq: 1, method: 'POST', urlPattern: '**/token', jsonPath: '$.pw' } }],
      },
      paramSchema: { type: 'object', properties: { password: { description: '비밀번호', secret: true } } },
      bound: { password: 'hunter2' },
    });
    연다(결과({ parts: [비밀주입] }));
    await screen.findByText('단계별 결과');
    expect(document.body.textContent).not.toContain('hunter2');
    expect(screen.getByText(/password ← 1번 POST \*\*\/token 응답의 \$\.pw = \*+/)).toBeTruthy();
  });

  it('실패 머리는 미확정 단계가 있을 때만 미확정 포함 칩을 곁들인다', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    expect(document.querySelector('.head .verdict')?.textContent).toBe('실패');
    expect(document.querySelector('.head .case-tag')?.textContent).toBe('미확정 포함');
    cleanup();
    연다(결과({ parts: [부품(1, { status: 'FAIL', error: { message: '깨짐' } })] }));
    await screen.findByText('단계별 결과');
    expect(document.querySelector('.head .verdict')?.textContent).toBe('실패');
    expect(document.querySelector('.head .case-tag')).toBeNull();
  });

  it('정보 칸 다섯', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    const 칸 = document.querySelector('.scn-info') as HTMLElement;
    for (const 라벨 of ['실행 시각', '소요', '대상 서버', '대상 주소', '실행자']) expect(within(칸).getByText(라벨)).toBeTruthy();
    for (const 값 of ['qa', 'https://qa.example.com', '김검사', '12.00초']) expect(within(칸).getByText(값)).toBeTruthy();
  });
});

describe('단계 줄', () => {
  it('종류 칩 · 이름 · 미확정 · 단독 실행 · 안 돈 단계', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    expect(within(줄('XSX-001')).getByText('케이스')).toBeTruthy();
    expect(within(줄('XSX-001')).getByText('단독 실행').className).toContain('tech-tag');
    expect(within(줄('XSX-003')).queryByText('단독 실행')).toBeNull();
    expect(within(줄('XSX-003')).getAllByText('미확정').some((el) => el.className.includes('case-tag'))).toBe(true);
    const 모킹 = screen.getByText('모킹 켜기').closest('.scn-part') as HTMLElement;
    expect(within(모킹).getByText('적용됨').className).toContain('tech-tag');
    const api = screen.getByText('API 호출').closest('.scn-part') as HTMLElement;
    expect(within(api).getByText('GET /api/orders → 200')).toBeTruthy();
    expect(within(api).getByText('– 실행 안 됨')).toBeTruthy();
    expect(api.querySelector('.verdict')).toBeNull();
  });

  it('모킹 구간 안 줄에 안내 문장', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    expect(within(줄('XSX-003')).getByText('모킹이 적용된 상태로 실행했습니다 — **/api/pay')).toBeTruthy();
    expect(screen.queryAllByText(/모킹이 적용된 상태로/).length).toBe(1);
  });

  it('모킹 구간 안 API 호출 단계는 모킹되지 않음 — 케이스 단계는 모킹이 적용된 안내 그대로', async () => {
    const 호출 = 부품(4, {
      kind: 'api', tcId: null, tcName: null,
      part: { kind: 'api', method: 'GET', path: '/api/orders', expectStatus: 200 },
      mocks: ['**/api/pay'],
    });
    연다(결과({ parts: [모킹켜기, 결제, 호출] }));
    await screen.findByText('단계별 결과');
    const api = screen.getByText('API 호출').closest('.scn-part') as HTMLElement;
    expect(within(api).getByText('모킹되지 않음').className).toContain('tech-tag');
    expect(within(api).getByText('이 단계의 API 호출은 모킹되지 않습니다')).toBeTruthy();
    expect(within(api).queryByText(/모킹이 적용된 상태로/)).toBeNull();
    expect(api.className).toContain('mocked');
    expect(within(줄('XSX-003')).getByText('모킹이 적용된 상태로 실행했습니다 — **/api/pay')).toBeTruthy();
    expect(within(줄('XSX-003')).queryByText('모킹되지 않음')).toBeNull();
  });

  it('판정 없음 단계는 받은 사유 글자를 보이고 안 돈 단계는 실행 안 됨만', async () => {
    const 멈춤 = 부품(5, { status: 'NA', error: { message: '러너가 이 부품 결과를 돌려주지 않았다' } });
    연다(결과({ parts: [멈춤, 안돈] }));
    await screen.findByText('단계별 결과');
    const 멈춘줄 = 줄('XSX-005');
    expect(within(멈춘줄).getByText('실행이 멈춘 사유')).toBeTruthy();
    expect(within(멈춘줄).getByText('러너가 이 부품 결과를 돌려주지 않았다').className).not.toContain('scn-error');
    const api = screen.getByText('API 호출').closest('.scn-part') as HTMLElement;
    expect(within(api).getByText('– 실행 안 됨')).toBeTruthy();
    expect(api.textContent).not.toContain('NOT_RUN');
    expect(within(api).queryByText('실행이 멈춘 사유')).toBeNull();
  });

  it('입력값은 비밀을 가린다', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    const 글 = 줄('XSX-001').textContent ?? '';
    expect(글).toContain('아이디 kim');
    expect(글).toContain('비밀번호 ********');
    expect(글).not.toContain('hunter2');
  });

  it('건너뜀 · 값 연결 · 정리 · 미확정 사유 · 오류', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    const 결제줄 = 줄('XSX-003');
    expect(within(결제줄).getByText('준비 「로그인」 — 1번에서 이미 실행')).toBeTruthy();
    expect(within(결제줄).getByText('값 주입')).toBeTruthy();
    expect(within(결제줄).getByText(/orderId ← .* = 812/)).toBeTruthy();
    expect(within(결제줄).getByText('마지막에 실행 DELETE /api/orders/812 → 204')).toBeTruthy();
    expect(within(결제줄).getByText('마지막에 실행 DELETE /api/x — ECONNRESET')).toBeTruthy();
    expect(within(결제줄).getByText('화면에서 읽은 값입니다')).toBeTruthy();
    const 오류 = within(결제줄).getByText(/기대와 다릅니다/);
    expect(오류.textContent).toBe('기대와 다릅니다\n둘째 줄');
  });

  it('절차는 접혀 있고 실패 단계만 처음부터 펼쳐진다', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    const 통과버튼 = within(줄('XSX-001')).getByRole('button', { name: '절차 1' });
    expect(통과버튼.getAttribute('aria-expanded')).toBe('false');
    expect(within(줄('XSX-001')).queryByText('로그인')).toBeNull();
    fireEvent.click(통과버튼);
    expect(통과버튼.getAttribute('aria-expanded')).toBe('true');
    expect(within(줄('XSX-001')).getByText('로그인')).toBeTruthy();

    const 실패버튼 = within(줄('XSX-003')).getByRole('button', { name: '절차 2' });
    expect(실패버튼.getAttribute('aria-expanded')).toBe('true');
    expect(within(줄('XSX-003')).getByText('결제 버튼 누르기')).toBeTruthy();
  });

  it('실패 절차에만 실패 화면 고리 — 시나리오 전체 순번으로 간다', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    const 고리 = screen.getAllByRole('link', { name: '실패 화면 보기' });
    expect(고리.length).toBe(1);
    expect(고리[0]?.getAttribute('href')).toBe(사진길(5));
    expect(고리[0]?.getAttribute('target')).toBe('_blank');
    expect(고리[0]?.getAttribute('rel')).toBe('noreferrer');
  });
});

describe('도는 중', () => {
  it('안내 문장을 보이고 2초마다 다시 묻다가 끝나면 멈춘다', async () => {
    vi.useFakeTimers();
    const 부름 = vi
      .spyOn(scenarioApi, 'result')
      .mockResolvedValueOnce(결과({ status: 'RUNNING', finishedAt: null, parts: [안돈] }))
      .mockResolvedValue(결과());
    render(<ScenarioResult runId={77} />);
    await act(async () => {});
    expect(screen.getByRole('status').textContent).toBe('실행 중입니다. 끝나면 결과가 채워집니다');
    expect(document.querySelector('.head .verdict')).toBeNull();
    expect(부름).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(부름).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('status')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(부름).toHaveBeenCalledTimes(2);
  });
});
