// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { 부품, 결과, 연다 } from './ScenarioResult.fixture.js';
import type { ScenarioRunPart } from './scenarioApi.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 프로시저부품 = (덮: Partial<ScenarioRunPart> = {}): ScenarioRunPart =>
  부품(2, {
    tcId: 'MTA-FN-101',
    tcName: '글쓰기',
    procId: 'MTA-TP-022',
    procName: '글쓰기 흐름',
    status: 'FAIL',
    cases: [
      { tcId: 'MTA-FN-100', name: '로그인', status: 'PASS', durationMs: 2000 },
      { tcId: 'MTA-FN-101', name: '글쓰기', status: 'FAIL', durationMs: 5000, error: { message: '버튼이 없습니다' } },
      { tcId: 'MTA-FN-102', name: '글 지우기', status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'MTA-FN-101' },
      { tcId: 'MTA-FN-103', name: '로그아웃' },
    ],
    steps: [
      { seq: 1, tcId: 'MTA-FN-100', title: '로그인한다', status: 'PASS', durationMs: 10, assertions: [] },
      { seq: 2, tcId: 'MTA-FN-101', title: '글을 쓴다', status: 'FAIL', durationMs: 10, assertions: [] },
    ],
    ...덮,
  });

describe('E2E 결과 · 프로시저 단계', () => {
  it('프로시저 헤더에 번호 · 이름 · 건수와 Fail · Blocked · Not tested 수가 서고 케이스마다 한 줄이다', async () => {
    연다(결과({ parts: [부품(1, {}), 프로시저부품()] }));
    await screen.findByText('단계별 결과');
    const 카드 = screen.getByText('MTA-TP-022').closest('.scn-part') as HTMLElement;
    const 머리 = card머리(카드);
    expect(머리.textContent).toContain('글쓰기 흐름');
    expect(머리.textContent).toContain('4건');
    expect(머리.textContent).toContain('Fail 1');
    expect(머리.textContent).toContain('Blocked 1');
    expect(머리.textContent).toContain('Not tested 1');
    expect(within(카드).getByText('프로시저').className).toContain('tech-tag');
    const 줄들 = 카드.querySelectorAll('.scn-pc li');
    expect(줄들).toHaveLength(4);
    expect(줄들[0]!.textContent).toContain('MTA-FN-100');
    expect(줄들[1]!.querySelector('.verdict')?.textContent).toBe('Fail');
    expect(줄들[2]!.textContent).toContain('Blocked');
    expect(줄들[2]!.textContent).toContain('선행 케이스 MTA-FN-101 실패');
    expect(줄들[3]!.textContent).toContain('Not tested');
    expect(카드.querySelectorAll('.flow-dots i')).toHaveLength(4);
  });

  it('맨 위 안내는 케이스가 아니라 프로시저 이름으로 적는다', async () => {
    연다(결과({ parts: [부품(1, {}), 프로시저부품()] }));
    expect(await screen.findByText('2번 단계 「글쓰기 흐름」에서 실패했습니다')).toBeTruthy();
  });

  it('막은 케이스가 제한 시간 초과(NA)면 그 글로 적는다', async () => {
    연다(
      결과({
        parts: [
          프로시저부품({
            cases: [
              { tcId: 'MTA-FN-100', name: '로그인', status: 'NA', error: { message: 'TIMEOUT' } },
              { tcId: 'MTA-FN-101', name: '글쓰기', status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'MTA-FN-100' },
            ],
          }),
        ],
      }),
    );
    await screen.findByText('단계별 결과');
    expect(screen.getByText('선행 케이스 MTA-FN-100 제한 시간 초과')).toBeTruthy();
  });

  it('실패한 단계는 절차 목록이 열려 있고 케이스가 바뀌는 자리에 케이스 줄을 끼운다', async () => {
    연다(결과({ parts: [프로시저부품()] }));
    await screen.findByText('단계별 결과');
    const 카드 = screen.getByText('MTA-TP-022').closest('.scn-part') as HTMLElement;
    const 묶음 = 카드.querySelectorAll('.scn-proc li.scn-proc-case');
    expect([...묶음].map((li) => li.textContent)).toEqual(['MTA-FN-100 로그인', 'MTA-FN-101 글쓰기']);
  });

  it('도는 중에는 아직 판정이 없는 케이스를 센 수에 넣지 않는다', async () => {
    연다(결과({ status: 'RUNNING', finishedAt: null, parts: [프로시저부품({ status: 'NA', cases: [{ tcId: 'MTA-FN-100', name: '로그인' }, { tcId: 'MTA-FN-101', name: '글쓰기' }] })] }));
    await screen.findByText('단계별 결과');
    const 카드 = screen.getByText('MTA-TP-022').closest('.scn-part') as HTMLElement;
    expect(card머리(카드).textContent).not.toContain('Not tested');
    expect(카드.querySelectorAll('.scn-pc .vd')).toHaveLength(0);
  });

  it('프로시저가 없는 케이스 단계는 지금 모양 그대로다', async () => {
    연다(결과({ parts: [부품(1, {})] }));
    await screen.findByText('단계별 결과');
    expect(document.querySelector('.scn-pc')).toBeNull();
    expect(screen.getByText('XSX-001')).toBeTruthy();
  });
});

function card머리(카드: HTMLElement): HTMLElement {
  return 카드.querySelector('.rf-proc') as HTMLElement;
}
