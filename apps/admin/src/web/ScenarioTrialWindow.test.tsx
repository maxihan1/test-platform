// @vitest-environment jsdom
import type { ScenarioPart } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { 장면통로 } from './TrialLive.js';
import { ScenarioTrialWindow, type 창시험 } from './ScenarioTrialWindow.js';
import type { 재료들 } from './scenarioView.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });
const 단계들 = [케이스('DMW-FN-087'), 케이스('DMW-FN-213'), { kind: 'wait', ms: 2000 } as ScenarioPart];
const 재료: 재료들 = new Map([
  ['DMW-FN-087', { name: '로그인' }],
  ['DMW-FN-213', { name: '장바구니 담기' }],
] as unknown as [string, never][]);

function 시험(덮: Partial<창시험> = {}): 창시험 {
  return {
    단계: 'running',
    trialId: 't-1',
    env: 'stg',
    결과: null,
    오류문장: null,
    단계들: null,
    vision: null,
    폰이름: null,
    지금단계들: [],
    시작시각: Date.now() - 21_000,
    중단함: false,
    중단: vi.fn(async () => undefined),
    ...덮,
  };
}

function 그리기(것: 창시험, 닫기 = vi.fn(), 다시 = vi.fn()) {
  vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
  render(<ScenarioTrialWindow 시험={것} 단계들={단계들} 재료={재료} platform="desktop" 모바일웹={false} on닫기={닫기} on다시={다시} />);
  return { 닫기, 다시 };
}

describe('E2E 시험 실행 창 — 도는 중', () => {
  it('제목 · 띠 · 단계 목록을 그린다. 러너가 아직 안 알렸으면 1단계가 기다리는 중이다', () => {
    그리기(시험());

    const 창 = screen.getByRole('dialog', { name: 'E2E 시험 실행' });
    expect(within(창).getByText('결과는 이 창에서만 보이고 실행 기록에 남지 않습니다')).toBeTruthy();
    expect(within(창).getByText('동작마다 1초 천천히')).toBeTruthy();
    expect(within(창).queryByText('경과 0:21')).toBeNull();
    expect(within(창).getByText(/· 경과 00:21/)).toBeTruthy();
    const 줄들 = [...창.querySelectorAll('.e2e-steps li')];
    expect(줄들).toHaveLength(3);
    expect(줄들[0]?.textContent).toContain('FN-087');
    expect(줄들[0]?.textContent).toContain('로그인');
    expect(줄들[0]?.textContent).toContain('기다리는 중');
    expect(줄들[2]?.textContent).toContain('2초 기다림');
    expect(줄들[1]?.className).toBe('wait');
  });

  it('끝난 단계는 걸린 시간, 지금 단계는 N초째, 남은 단계는 흐리다', () => {
    그리기(
      시험({
        지금단계들: [
          { seq: 1, title: '', elapsedMs: 1500, 시작: 1000 },
          { seq: 2, title: '', elapsedMs: 4200, 시작: 2500 },
        ],
      }),
    );

    const 줄들 = [...screen.getByRole('dialog').querySelectorAll('.e2e-steps li')];
    expect(줄들.map((줄) => 줄.className)).toEqual(['done', 'now', 'wait']);
    expect(줄들[0]?.querySelector('.t')?.textContent).toBe('2초');
    expect(줄들[1]?.querySelector('.t')?.textContent).toBe('5초째');
    expect(줄들[2]?.querySelector('.t')?.textContent).toBe('');
    expect(screen.getByRole('dialog').querySelector('.e2e-prog-row span')?.textContent).toBe('2 / 3 단계');
  });

  it('폰을 잡았으면 장면 칸 머리에 폰 이름과 Device VISION 링크가 선다', () => {
    그리기(시험({ vision: 'https://vision.example/#p', 폰이름: 'Galaxy S23' }));

    expect(screen.getByText('Galaxy S23')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Device VISION 에서 보기 ↗' }).getAttribute('href')).toBe('https://vision.example/#p');
  });

  it('크게 보기는 왼쪽 목록을 접고 작게 보기로 돌아온다', () => {
    그리기(시험());
    const 몸 = screen.getByRole('dialog').querySelector('.e2e-run')!;

    fireEvent.click(screen.getByRole('button', { name: '크게 보기' }));
    expect(몸.classList.contains('big')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '작게 보기' }));
    expect(몸.classList.contains('big')).toBe(false);
  });

  it('바닥 중단은 한 번 묻고, 중단하면 시험을 멈추되 창은 그대로 둔다', () => {
    const 것 = 시험();
    const { 닫기 } = 그리기(것);

    fireEvent.click(screen.getByRole('button', { name: '중단' }));
    const 묻기 = within(screen.getByRole('dialog', { name: '시험 실행을 중단할까요?' }));
    expect(묻기.getByText('진행 중인 단계는 바로 멈추고 남은 단계는 실행하지 않습니다')).toBeTruthy();
    expect(document.activeElement).toBe(묻기.getByRole('button', { name: '계속 실행' }));

    fireEvent.click(묻기.getByRole('button', { name: '중단' }));

    expect(것.중단).toHaveBeenCalledTimes(1);
    expect(닫기).not.toHaveBeenCalled();
  });

  it('× 로 닫으면 「닫으면 멈춘다」고 한 번 묻고, 계속 보기를 누르면 아무 일도 없다', () => {
    const 것 = 시험();
    const { 닫기 } = 그리기(것);

    fireEvent.click(screen.getByRole('button', { name: '창 닫기' }));
    const 묻기 = within(screen.getByRole('dialog', { name: '닫으면 시험 실행을 멈춥니다' }));
    expect(document.activeElement).toBe(묻기.getByRole('button', { name: '계속 보기' }));
    fireEvent.click(묻기.getByRole('button', { name: '계속 보기' }));

    expect(screen.queryByRole('dialog', { name: '닫으면 시험 실행을 멈춥니다' })).toBeNull();
    expect(것.중단).not.toHaveBeenCalled();
    expect(닫기).not.toHaveBeenCalled();
  });

  it('Esc 로 닫아도 묻고, 중단하면 시험을 멈추고 창을 닫는다', () => {
    const 것 = 시험();
    const { 닫기 } = 그리기(것);

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(within(screen.getByRole('dialog', { name: '닫으면 시험 실행을 멈춥니다' })).getByRole('button', { name: '멈추고 닫기' }));

    expect(것.중단).toHaveBeenCalledTimes(1);
    expect(닫기).toHaveBeenCalledTimes(1);
  });

  it('이미 멈추는 중이면 × 가 묻지 않고 닫는다', () => {
    const { 닫기 } = 그리기(시험({ 중단함: true }));

    expect((screen.getByRole('button', { name: '중단하는 중' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '창 닫기' }));

    expect(닫기).toHaveBeenCalledTimes(1);
  });
});

describe('E2E 시험 실행 창 — 결과', () => {
  const 끝남 = (덮: Partial<창시험> = {}) =>
    시험({
      단계: 'done',
      결과: {
        status: 'NA',
        durationMs: 5000,
        parts: [
          { seq: 1, status: 'PASS', durationMs: 1200, steps: [], mocks: [] },
          { seq: 2, status: 'NA', durationMs: 0, steps: [], mocks: [], error: { message: 'STOPPED' } },
          { seq: 3, status: 'NA', durationMs: 0, steps: [], mocks: [], error: { message: 'NOT_RUN' } },
        ],
      },
      ...덮,
    });

  it('같은 창이 결과로 넘어가 점수 알약과 단계 줄을 그리고, 사람이 멈춘 단계는 실행 중단으로 멈춤이다', () => {
    그리기(끝남());

    const 창 = screen.getByRole('dialog', { name: 'E2E 시험 실행 결과' });
    expect([...창.querySelectorAll('.trial-sum .pill')].map((알약) => 알약.textContent)).toEqual(['통과 1', '실패 0', '미실행 2']);
    expect(within(창).getByText('실행 중단으로 멈춤')).toBeTruthy();
    expect(within(창).getByText('– 실행 안 함')).toBeTruthy();
    expect(창.querySelector('.e2e-steps')).toBeNull();
    expect(창.querySelectorAll('.frame-steps [aria-current="step"]')[0]?.textContent).toBe('결과');
  });

  it('닫기는 묻지 않고 닫고, 다시 시험은 다시 건다', () => {
    const { 닫기, 다시 } = 그리기(끝남());

    fireEvent.click(screen.getByRole('button', { name: '다시 시험' }));
    expect(다시).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(닫기).toHaveBeenCalledTimes(1);
  });
});
