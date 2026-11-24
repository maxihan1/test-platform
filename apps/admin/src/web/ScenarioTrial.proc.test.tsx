// @vitest-environment jsdom
// E2E 시험 실행 결과 · 프로시저 단계 — 실행 결과 화면과 같은 프로시저 헤더와 케이스 줄 (도메인/시나리오 §3.7 결정 17)

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TrialRow } from './ScenarioTrial.js';

afterEach(cleanup);

describe('TrialRow · 프로시저 단계', () => {
  it('종류 칩이 프로시저이고 헤더 아래 케이스마다 판정이 선다', () => {
    render(
      <ol>
        <TrialRow
          trialId={null}
          재료={new Map()}
          단계={{ kind: 'case', tcId: 'MTA-FN-101', params: {}, expected: {}, skipSteps: [] }}
          part={{
            seq: 1,
            status: 'FAIL',
            durationMs: 9000,
            steps: [],
            mocks: [],
            procId: 'MTA-TP-022',
            procName: '글쓰기 흐름',
            cases: [
              { tcId: 'MTA-FN-100', name: '로그인', status: 'PASS', durationMs: 1000 },
              { tcId: 'MTA-FN-101', name: '글쓰기', status: 'FAIL', durationMs: 8000, error: { message: '버튼이 없습니다' } },
              { tcId: 'MTA-FN-102', name: '로그아웃', status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'MTA-FN-101' },
            ],
          }}
        />
      </ol>,
    );
    expect(screen.getByText('프로시저').className).toContain('tech-tag');
    const 머리 = document.querySelector('.rf-proc') as HTMLElement;
    expect(머리.textContent).toContain('MTA-TP-022');
    expect(머리.textContent).toContain('3건');
    expect(머리.textContent).toContain('Fail 1');
    expect(머리.textContent).toContain('Blocked 1');
    expect(screen.getByText('선행 케이스 MTA-FN-101 실패')).toBeTruthy();
    expect(screen.queryByText('케이스')).toBeNull();
  });

  it('프로시저 칸이 없는 단계는 케이스 이름 그대로다', () => {
    render(
      <ol>
        <TrialRow
          trialId={null}
          재료={new Map([['ZSB-001', { tcId: 'ZSB-001', name: '로그인', platforms: ['desktop'], precondition: [], paramSchema: {}, expectedSchema: {}, steps: [], r16: false, unconfirmed: null }]])}
          단계={{ kind: 'case', tcId: 'ZSB-001', params: {}, expected: {}, skipSteps: [] }}
          part={{ seq: 1, status: 'PASS', durationMs: 1000, steps: [], mocks: [] }}
        />
      </ol>,
    );
    expect(screen.getByText('로그인')).toBeTruthy();
    expect(document.querySelector('.rf-proc')).toBeNull();
  });
});
