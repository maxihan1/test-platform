// @vitest-environment jsdom
// 실행 기록의 「자동 수정」 표시 — 「수정 후 통과」 카드 · 판정 셈에서 빼기 · 「자동 수정 N」 거르기 · 다시 실행에서 빼기 · 실행 줄 (도메인/BTS §8.15 「자동 수정 표시」 B)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { FailureBts, RunListRow, 카드자동수정, 카드자동수정중 } from './api.js';
import { 실패다시실행 } from './RerunFailed.js';
import { 실행 } from './RunResult.fixture.js';
import { RUN_ID, 그리기, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';
import { 실행줄 } from './RunListRow.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

const 고침: 카드자동수정 = {
  issueKey: 'MQA-168',
  issueUrl: 'https://bts.example.com/issues/MQA-168',
  requestId: null,
  movedBy: 'QA 맥시',
  prUrl: 'https://github.com/o/r/pull/713',
  merge: 'AUTO',
  rerunId: 21109,
  rerunPage: true,
  at: '2026-11-11T03:00:00.000Z',
  devices: [
    { platform: 'desktop', status: 'PASS' },
    { platform: 'mobile', status: 'PASS' },
  ],
};
const 보냄: FailureBts = { issueKey: 'MQA-168', url: 'https://bts.example.com/issues/MQA-168', state: 'SENT', reason: null, resolution: null };

function 둘(autoFixCount = 1) {
  return 그리기(
    쪽([케이스('ZZI-0001', '주문 API 401', [장치('mobile', 2)], { autoFix: 고침, bts: 보냄 }), 케이스('ZZI-0002', '회원가입', [장치('desktop', 3)], { autoFix: null })], { autoFixCount } as never),
    [줄(1, 'ZZI-0001', 'desktop', 'PASS'), 줄(2, 'ZZI-0001', 'mobile', 'PASS'), 줄(3, 'ZZI-0002', 'desktop', 'FAIL')],
  );
}

describe('「수정 후 통과」 카드', () => {
  it('머리는 「수정 후 통과」 · 실패였던 디바이스만 「실패 → 통과」 · 판정 줄 자리에 자동 수정 한 줄', async () => {
    둘();
    await screen.findByText('주문 API 401');
    const 카드 = document.querySelector('.fc-card.fc-fixed')!;
    expect(카드.querySelector('.fix-tag')?.textContent).toBe('수정 후 통과');
    const 칩 = 카드.querySelector('.fc-devs')?.textContent ?? '';
    expect(칩).toMatch(/PC\s*통과/);
    expect(칩).toMatch(/모바일\s*실패\s*→\s*통과/);

    const 한줄 = 카드.querySelector('.fc-body')?.textContent ?? '';
    expect(한줄).toContain('테스트 수정 요청으로 자동 수정했어요 — QA 맥시 · Issue Bunker MQA-168 → PR #713 자동 반영 → RUN 21109 PC 통과 · 모바일 통과');
    expect(screen.getByRole('link', { name: 'RUN 21109' }).getAttribute('href')).toBe('#/runs/21109');
    expect(screen.queryByRole('link', { name: 'Issue Bunker MQA-168 에서 확인 중' })).toBeNull();
  });

  it('다시 실행에서 통과하지 않은 디바이스는 「실패 → 통과」가 아니다 · 결과 화면이 없는 실행은 번호만', async () => {
    그리기(
      쪽([
        케이스('ZZI-0001', '주문 API 401', [장치('desktop', 1), 장치('mobile', 2)], {
          autoFix: { ...고침, rerunPage: false, devices: [{ platform: 'desktop', status: 'PASS' }] },
        }),
      ]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0001', 'mobile', 'FAIL')],
    );
    await screen.findByText('주문 API 401');
    const 칩 = document.querySelector('.fc-devs')?.textContent ?? '';
    expect(칩).toMatch(/PC\s*실패\s*→\s*통과/);
    expect(칩).not.toMatch(/모바일\s*실패\s*→/);
    expect(screen.queryByRole('link', { name: 'RUN 21109' })).toBeNull();
    expect(document.querySelector('.fc-body')?.textContent).toContain('RUN 21109 PC 통과');
  });

  it('「판정 안 한 카드」 셈에서 빠지고, 「자동 수정 N」을 누르면 서버가 거른 쪽을 다시 받는다', async () => {
    const { 부름 } = 둘();
    expect((await screen.findByRole('button', { name: /판정 안 한 카드/ })).textContent).toContain('1');
    fireEvent.click(screen.getByRole('button', { name: '자동 수정 1' }));
    await waitFor(() => expect(부름).toHaveBeenLastCalledWith(RUN_ID, 1, undefined, true));
  });

  it('자동 수정 카드가 없으면 거르기 칩이 없다', async () => {
    둘(0);
    await screen.findByText('회원가입');
    expect(screen.queryByRole('button', { name: /^자동 수정/ })).toBeNull();
  });
});

describe('실패 다시 실행', () => {
  it('자동 수정으로 통과한 케이스는 다시 돌릴 실패에서 뺀다', () => {
    render(
      <실패다시실행 runId={20914} items={[줄(1, 'ZZI-0001', 'mobile', 'FAIL'), 줄(2, 'ZZI-0002', 'desktop', 'FAIL')]} env="qa" 된다 자동수정={['ZZI-0001']} />,
    );
    expect(screen.getByRole('button', { name: '실패 1건 다시 실행' })).toBeTruthy();
  });
});

describe('실행 기록 줄', () => {
  it('판정 칸에 「자동 수정 N」 — 0 이면 안 그린다', () => {
    render(<실행줄 run={{ ...실행, autoFixed: 2 } as RunListRow} 고름={false} on고르기={() => undefined} />);
    expect(screen.getByText('자동 수정 2')).toBeTruthy();
    cleanup();
    render(<실행줄 run={{ ...실행, autoFixed: 0 } as RunListRow} 고름={false} on고르기={() => undefined} />);
    expect(screen.queryByText(/자동 수정/)).toBeNull();
  });
});

describe('게임 실패 자동 수정 — 도는 중 · 통과 못 하고 끝남', () => {
  const 중 = (더: Partial<카드자동수정중> = {}): 카드자동수정중 => ({
    state: 'FIXING', requestId: 8801, prUrl: null, needsPerson: false, personWhy: [], rerunId: null, rerunPage: false, reason: null, at: '2026-11-20T03:00:00.000Z', ...더,
  });
  const 카드그리기 = (autoFixing: 카드자동수정중) => {
    그리기(쪽([케이스('ZZI-0001', '던전 입장', [장치('mobile', 2)], { autoFixing })]), [줄(2, 'ZZI-0001', 'mobile', 'FAIL')]);
    return screen.findByText('던전 입장');
  };
  const 이름표 = () => [...document.querySelectorAll('.fc-card .fc-cause-label')].map((e) => e.textContent);

  it('도는 중이면 머리에 「자동 수정 중」 · 자동 수정 줄만 서고 판정 줄은 없다', async () => {
    await 카드그리기(중());
    expect(document.querySelector('.fc-card .fc-head .fix-tag')?.textContent).toBe('자동 수정 중');
    expect(이름표()).toEqual(['자동 수정']);
    expect(document.querySelector('.fc-body')?.textContent).toContain('에이전트가 테스트를 수정하는 중이에요 — 작성 요청 #8801');
    expect(screen.getByRole('link', { name: '작성 요청 #8801' }).getAttribute('href')).toBe('#/authoring/8801');
  });

  it('사람 확인을 기다리면 까닭과 반영하러 가는 고리를 보인다', async () => {
    await 카드그리기(중({ state: 'WAIT_MERGE', needsPerson: true, personWhy: ['확인 문장이 줄었어요'], prUrl: 'https://github.com/o/r/pull/9' }));
    expect(document.querySelector('.fc-body')?.textContent).toContain('수정한 테스트를 사람이 반영해야 해요 — 확인 문장이 줄었어요 → PR #9');
    expect(screen.getByRole('link', { name: '테스트 작성 › 결정 필요에서 반영' }).getAttribute('href')).toBe('#/authoring?todo=1');
    expect(이름표()).toEqual(['자동 수정']);
  });

  it('수정했지만 다시 실행에서도 실패하면 머리는 「자동 수정 실패」 · 자동 수정 줄 아래에 판정 줄이 선다', async () => {
    await 카드그리기(중({ state: 'FAILED', prUrl: 'https://github.com/o/r/pull/10', rerunId: 21200, rerunPage: true }));
    expect(document.querySelector('.fc-card .fc-head .fix-tag')?.textContent).toBe('자동 수정 실패');
    expect(이름표()).toEqual(['자동 수정', '판정']);
    expect(document.querySelector('.fc-body')?.textContent).toContain('수정했지만 다시 실행에서도 실패했어요 → PR #10 · RUN 21200');
  });

  it('다시 실행하니 통과한 줄은 꼬리표 없이 한 줄만 달고 판정 줄도 선다', async () => {
    await 카드그리기(중({ state: 'FLAKY' }));
    expect(document.querySelector('.fc-card .fc-head .fix-tag')).toBeNull();
    expect(이름표()).toEqual(['자동 수정', '판정']);
    expect(document.querySelector('.fc-body')?.textContent).toContain('다시 실행하니 통과해서 수정하지 않았어요');
  });
});
