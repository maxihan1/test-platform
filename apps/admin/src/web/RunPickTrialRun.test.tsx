// @vitest-environment jsdom
// 실행 창의 시험 실행 중 · 중단 확인 · 완료 모양과 정식 실행 시작 확인 창 (도메인/실행 §8.10 · 시안 7판 ③-1 ④ ⑤ ⑥)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type TrialResult, type TrialState } from './api.js';
import { 그린다, 서비스, 케이스, 시작누름 } from './runPick.fixture.js';
import { RunPickModal } from './RunPickModal.js';
import { 장면통로 } from './TrialLive.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 둘째 = { ...케이스, tcId: 'ZRS-002', name: '둘째 케이스' };
const 통과: TrialResult = { status: 'PASS', durationMs: 1200, steps: [{ seq: 1, title: '로그인한다', status: 'PASS', durationMs: 100, assertions: [] }] };
const 실패: TrialResult = {
  status: 'FAIL',
  durationMs: 1800,
  steps: [
    { seq: 1, title: '로그인한다', status: 'PASS', durationMs: 100, assertions: [] },
    { seq: 2, title: '수량을 3으로 바꾼다', status: 'FAIL', durationMs: 50, assertions: [], error: { message: '수량 칸을 찾지 못했습니다' } },
  ],
};

function 둘을연다(onRun = vi.fn()) {
  localStorage.clear();
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
  vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
  render(<RunPickModal 케이스들={[케이스, 둘째]} service={서비스} onRun={onRun} onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
  return onRun;
}

function 시험시작() {
  fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
  시작누름('시험 실행 시작');
}

/** 시험 번호마다 응답 차례를 준다. 차례를 다 쓰면 마지막 것을 되풀이한다 */
function 차례대로(답들: Record<string, TrialState[]>) {
  const 몇째: Record<string, number> = {};
  vi.spyOn(api, 'startTrial').mockImplementation((tcId) => Promise.resolve({ trialId: `t-${tcId}` }));
  return vi.spyOn(api, 'getTrial').mockImplementation((_tcId, trialId) => {
    const 줄 = 답들[trialId] ?? [{ status: 'RUNNING' }];
    const i = Math.min(몇째[trialId] ?? 0, 줄.length - 1);
    몇째[trialId] = i + 1;
    return Promise.resolve(줄[i]!);
  });
}

describe('시험 실행 중', () => {
  it('물을 때마다 받은 단계를 쌓고 마지막 줄을 지금 단계로 표시한다', async () => {
    차례대로({
      't-ZRS-001': [
        { status: 'RUNNING', step: { seq: 1, title: '로그인한다', elapsedMs: 900 } },
        { status: 'RUNNING', step: { seq: 2, title: '상품 목록을 연다', elapsedMs: 1500 } },
      ],
    });
    둘을연다();
    시험시작();

    expect(await screen.findByText('상품 목록을 연다', {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText('로그인한다').closest('li')?.className).toBe('done');
    expect(screen.getByText('상품 목록을 연다').closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByRole('dialog', { name: '시험 실행 중 · 1 / 2' })).toBeTruthy();
  });

  it('단계가 늘면 단계 목록 칸만 굴리고 둘레 칸은 끌어 내리지 않는다 — 한 건이 끝나 다음 건으로 넘어가도 같다', async () => {
    const 끌어오기 = vi.fn();
    Element.prototype.scrollIntoView = 끌어오기;
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
      return this.tagName === 'LI' ? 40 * (Number(this.querySelector('.no')?.textContent ?? '1') - 1) : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(40);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(60);
    try {
      차례대로({
        't-ZRS-001': [
          { status: 'RUNNING', step: { seq: 1, title: '로그인한다', elapsedMs: 900 } },
          { status: 'RUNNING', step: { seq: 2, title: '상품 목록을 연다', elapsedMs: 1500 } },
          { status: 'DONE', result: 통과 },
        ],
        't-ZRS-002': [{ status: 'RUNNING', step: { seq: 1, title: '둘째 첫 단계', elapsedMs: 300 } }],
      });
      둘을연다();
      시험시작();

      await screen.findByText('상품 목록을 연다', {}, { timeout: 4000 });
      expect((document.querySelector('.trial-now-steps') as HTMLElement).scrollTop).toBe(20);

      await screen.findByText('둘째 첫 단계', {}, { timeout: 6000 });
      expect(끌어오기).not.toHaveBeenCalled();
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    }
  }, 15000);
});

describe('중단 확인', () => {
  it('「계속 실행」은 묻기만 닫고 실행을 끊지 않는다', async () => {
    차례대로({});
    const 끊기 = vi.spyOn(api, 'abortTrial').mockResolvedValue({ aborted: true });
    둘을연다();
    시험시작();

    fireEvent.click(await screen.findByRole('button', { name: '중단' }));
    const 묻기 = within(screen.getByRole('dialog', { name: '시험 실행을 중단할까요?' }));
    expect(묻기.getByText('진행 중인 ZRS-001 는 바로 멈추고 남은 1건은 실행하지 않습니다')).toBeTruthy();
    expect(묻기.getByText('확인하는 동안에도 실행은 계속됩니다')).toBeTruthy();
    fireEvent.click(묻기.getByRole('button', { name: '계속 실행' }));

    expect(screen.queryByRole('dialog', { name: '시험 실행을 중단할까요?' })).toBeNull();
    expect(끊기).not.toHaveBeenCalled();
  });

  it('중단하면 지금 시험을 끊고 남은 케이스는 걸지 않으며 완료 창이 「중단함」으로 뜬다', async () => {
    const 중단결과: TrialResult = { status: 'NA', durationMs: 400, steps: [], error: { message: 'ABORTED' } };
    let 끊음 = false;
    vi.spyOn(api, 'startTrial').mockImplementation((tcId) => Promise.resolve({ trialId: `t-${tcId}` }));
    vi.spyOn(api, 'getTrial').mockImplementation(() => Promise.resolve(끊음 ? { status: 'DONE', result: 중단결과 } : { status: 'RUNNING' }));
    const 끊기 = vi.spyOn(api, 'abortTrial').mockImplementation(() => {
      끊음 = true;
      return Promise.resolve({ aborted: true });
    });
    둘을연다();
    시험시작();

    fireEvent.click(await screen.findByRole('button', { name: '중단' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '시험 실행을 중단할까요?' })).getByRole('button', { name: '중단' }));

    expect(await screen.findByRole('dialog', { name: '시험 실행 중단함' }, { timeout: 4000 })).toBeTruthy();
    expect(끊기).toHaveBeenCalledWith('ZRS-001', 't-ZRS-001');
    expect(api.startTrial).toHaveBeenCalledTimes(1);
    const 결과 = within(document.querySelector('.trial-res') as HTMLElement);
    expect(결과.getByText('중단')).toBeTruthy();
    expect(결과.getByText('실행 안 함')).toBeTruthy();
    expect(document.querySelector('.trial-score .s b')?.textContent).toBe('2');
  });

  it('묻는 사이 마지막 케이스가 끝나면 묻기를 닫고 완료 창을 보인다', async () => {
    let 풀기!: () => void;
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockImplementation(() => new Promise((ok) => { 풀기 = () => ok({ status: 'DONE', result: 통과 }); }));
    await 그린다();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    시험시작();

    fireEvent.click(await screen.findByRole('button', { name: '중단' }));
    expect(screen.getByRole('dialog', { name: '시험 실행을 중단할까요?' })).toBeTruthy();
    풀기();

    expect(await screen.findByRole('dialog', { name: '시험 실행 완료' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: '시험 실행을 중단할까요?' })).toBeNull();
  });
});

describe('완료 창', () => {
  it('통과 · 실패 수와 실패한 단계 · 까닭을 보이고, 「실패 1건 다시 시험」은 실패한 것만 다시 돈다', async () => {
    차례대로({ 't-ZRS-001': [{ status: 'DONE', result: 통과 }], 't-ZRS-002': [{ status: 'DONE', result: 실패 }] });
    둘을연다();
    시험시작();

    expect(await screen.findByRole('dialog', { name: '시험 실행 완료' }, { timeout: 4000 })).toBeTruthy();
    expect(document.querySelector('.trial-score .p b')?.textContent).toBe('1');
    expect(document.querySelector('.trial-score .f b')?.textContent).toBe('1');
    expect(screen.getByText('2단계 · 수량을 3으로 바꾼다')).toBeTruthy();
    expect(screen.getByText('수량 칸을 찾지 못했습니다')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '실패 1건 다시 시험' }));
    await waitFor(() => expect(api.startTrial).toHaveBeenCalledTimes(3));
    expect(vi.mocked(api.startTrial).mock.calls[2]?.[0]).toBe('ZRS-002');
  });

  it('실패 줄은 케이스 줄 아래에 단계 · 유형 · 한국어 한 줄로 서고 러너 원문은 접힌 「원문 보기」 안에만 있다', async () => {
    const 원문 = "Error: Can't call click on element with selector \"id=buy_now_button\" because element wasn't found";
    const 깨짐: TrialResult = { ...실패, steps: [실패.steps[0]!, { ...실패.steps[1]!, error: { message: 원문 } }] };
    차례대로({
      't-ZRS-001': [{ status: 'DONE', result: 통과, failure: null }],
      't-ZRS-002': [{ status: 'DONE', result: 깨짐, failure: { type: 'notFound', reason: '구매하기 단추를 찾지 못했습니다' } }],
    });
    둘을연다();
    시험시작();

    await screen.findByRole('dialog', { name: '시험 실행 완료' }, { timeout: 4000 });
    const 줄 = document.querySelector('.trial-res li.bad') as HTMLElement;
    const 실패줄 = 줄.querySelector('.why') as HTMLElement;
    expect(within(실패줄).getByText('2단계 · 수량을 3으로 바꾼다')).toBeTruthy();
    expect(within(실패줄).getByText('요소 미검출')).toBeTruthy();
    expect(within(실패줄).getByText('구매하기 단추를 찾지 못했습니다')).toBeTruthy();
    const 접힘 = within(실패줄).getByText('원문 보기').closest('details') as HTMLDetailsElement;
    expect(접힘.open).toBe(false);
    expect(접힘.textContent).toContain('buy_now_button');
    expect(줄.querySelector('.nm')?.textContent).toBe('둘째 케이스');
  });

  it('러너에 못 닿은 미실행은 서버 안내 문장을 실패 줄에 한 번만 두고 「원문 보기」를 안 단다', async () => {
    const 못닿음: TrialResult = { status: 'NA', durationMs: 10, steps: [], error: { message: '러너에 닿지 못했습니다' } };
    차례대로({
      't-ZRS-001': [{ status: 'DONE', result: 통과, failure: null }],
      't-ZRS-002': [{ status: 'DONE', result: 못닿음, failure: { type: 'environment', reason: '러너에 닿지 못했습니다' } }],
    });
    둘을연다();
    시험시작();

    await screen.findByRole('dialog', { name: '시험 실행 완료' }, { timeout: 4000 });
    const 실패줄 = [...document.querySelectorAll('.trial-res .why')];
    expect(실패줄).toHaveLength(1);
    expect(within(실패줄[0] as HTMLElement).getAllByText('러너에 닿지 못했습니다')).toHaveLength(1);
    expect(within(실패줄[0] as HTMLElement).queryByText('원문 보기')).toBeNull();
  });

  it('「실행」은 정식 실행 시작 확인 창을 거쳐 같은 케이스를 걸고 값 창으로 돌아간다 — 거절 사유가 그 바닥에 뜬다', async () => {
    차례대로({ 't-ZRS-001': [{ status: 'DONE', result: 통과 }], 't-ZRS-002': [{ status: 'DONE', result: 통과 }] });
    const onRun = 둘을연다();
    시험시작();

    await screen.findByRole('dialog', { name: '시험 실행 완료' }, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '정식 실행을 시작할까요?' })).getByRole('button', { name: '실행 시작' }));
    expect(onRun.mock.calls[0]?.[0]).toMatchObject({ env: 'qa', items: [{ tcId: 'ZRS-001' }, { tcId: 'ZRS-002' }] });
    expect(screen.getByLabelText('대상 서버')).toBeTruthy();
  });

  it('「닫기」는 값 창으로 돌아간다', async () => {
    차례대로({ 't-ZRS-001': [{ status: 'DONE', result: 통과 }], 't-ZRS-002': [{ status: 'DONE', result: 통과 }] });
    둘을연다();
    시험시작();

    await screen.findByRole('dialog', { name: '시험 실행 완료' }, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.getByLabelText('대상 서버')).toBeTruthy();
  });
});

describe('정식 실행 시작 확인', () => {
  it('한 건 · 반복 1 이면 붙을 실행을 읽어 「RUN N 결과에 다시 실행으로 추가」를 적는다', async () => {
    const 읽기 = vi.spyOn(api, 'rerunTarget').mockResolvedValue({ target: { runId: 112, title: '어젯밤 실행', startedAt: '2026-11-04T12:00:00.000Z' } });
    await 그린다();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    fireEvent.click(screen.getByRole('button', { name: '실행' }));

    expect(await screen.findByText(/끝나면 RUN 112 결과에 다시 실행으로 추가됩니다 · 어젯밤 실행/)).toBeTruthy();
    expect(읽기).toHaveBeenCalledWith('ZRS-001', 'qa', ['desktop'], 'server');
  });

  it('붙을 실행이 없으면 이 케이스 상세에만 남는다고 적는다', async () => {
    vi.spyOn(api, 'rerunTarget').mockResolvedValue({ target: null });
    await 그린다();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    fireEvent.click(screen.getByRole('button', { name: '실행' }));

    expect(await screen.findByText('아직 전체 테스트에 들어간 적이 없어 이 케이스 상세에만 남습니다')).toBeTruthy();
  });
});
