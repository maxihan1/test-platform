// @vitest-environment jsdom
// 실행 창의 시험 실행 중 · 중단 확인 모양과 정식 실행 시작 확인 창 (도메인/실행 §8.10 · §8.16 ③ · 시안 A). 결과는 RunPickTrialDone.test.tsx

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type TrialResult } from './api.js';
import { 그린다, 서비스, 케이스 } from './runPick.fixture.js';
import { RunPickModal } from './RunPickModal.js';
import { 장면통로 } from './TrialLive.js';
import { 둘을연다, 시험시작, 차례대로, 통과 } from './trialRun.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
    expect(screen.getByRole('dialog', { name: '시험 실행 · 1 / 2' })).toBeTruthy();
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

describe('시험 실행 중 — 시안 A ③', () => {
  it('스캔이 센 제목이 오면 처음부터 전체 단계를 세우고 지금 단계 뒤는 흐린 기다림이다', async () => {
    차례대로({
      't-ZRS-001': [{ status: 'RUNNING', stepTitles: ['로그인한다', '상품 목록을 연다', '담는다'], step: { seq: 2, title: '상품 목록을 연다', elapsedMs: 1_500 } }],
    });
    둘을연다();
    시험시작();

    const 지금 = await screen.findByText('상품 목록을 연다', {}, { timeout: 4000 });
    expect(지금.closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(지금.closest('li')?.textContent).toContain('2초째');
    expect(screen.getByText('담는다').closest('li')?.className).toBe('wait');
    expect(screen.getByText('로그인한다').closest('li')?.className).toBe('done');
  });

  it('대기열 줄은 디바이스 꼬리표와 상태 알약 하나다', async () => {
    차례대로({ 't-ZRS-001': [{ status: 'DONE', result: 통과 }] });
    둘을연다();
    시험시작();

    const 대기열 = await screen.findByRole('list', { name: '시험 차례' });
    await waitFor(() => expect(within(대기열).getByText('통과 1')).toBeTruthy(), { timeout: 4000 });
    expect(within(대기열).getAllByText('PC').length).toBeGreaterThan(0);
    expect(within(대기열).getByText('진행 중')).toBeTruthy();
  });

  it('첫 장면 전에는 「브라우저를 여는 중」 뼈대를 그리고 늦춘다는 말은 띠 오른쪽에 한 번만 있다', async () => {
    차례대로({});
    둘을연다();
    시험시작();

    expect(await screen.findByText('브라우저를 여는 중')).toBeTruthy();
    expect(screen.getAllByText('동작마다 1초 천천히')).toHaveLength(1);
    expect(document.querySelector('.trial-band .r')?.textContent).toBe('동작마다 1초 천천히');
  });

  it('모바일 차례면 장면 칸을 폰 폭으로 줄이고 가상 기기라고 적는다', async () => {
    차례대로({});
    localStorage.clear();
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    render(<RunPickModal 케이스들={[{ ...케이스, platforms: ['mobile'] }]} service={서비스} onRun={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    시험시작();

    expect(await screen.findByText('가상 디바이스 · iPhone 14')).toBeTruthy();
    expect(document.querySelector('.trial-run')?.classList.contains('phone')).toBe(true);
  });
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
    expect(결과.getByText('미실행')).toBeTruthy();
    expect(document.querySelector('.trial-sum .pill.na b')?.textContent).toBe('2');
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

    expect(await screen.findByRole('dialog', { name: '시험 실행 결과' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: '시험 실행을 중단할까요?' })).toBeNull();
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

    expect(await screen.findByText('이 케이스만 따로 실행해 케이스 상세의 실행 기록에만 남습니다')).toBeTruthy();
  });
});
