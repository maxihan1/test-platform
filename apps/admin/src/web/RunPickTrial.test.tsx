// @vitest-environment jsdom
// 실행 창의 「시험 실행」 조각 — 결과 배지 · 한 건 창의 절차 목록 · 오른쪽 실시간 칸 (도메인/실행 §8.10)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type TrialResult } from './api.js';
import { 그린다, 서비스, 케이스, 시작누름 } from './runPick.fixture.js';
import { RunPickModal } from './RunPickModal.js';
import { 시험배지 } from './RunPickTrial.js';
import { 장면통로 } from './TrialLive.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('시험배지', () => {
  it('끝난 칸에는 판정과 걸린 시간만 두고 오류 글은 넣지 않는다 — 긴 원문이 케이스 이름 칸을 누르지 않게', () => {
    const 결과: TrialResult = { status: 'FAIL', durationMs: 2000, steps: [], error: { message: "Error: Can't call click on element" } };
    const { container } = render(<시험배지 칸들={[{ platform: 'desktop', 줄: { 종류: 'done', 결과 } }]} />);

    expect(container.textContent).not.toContain('Error');
    expect(container.querySelector('.verdict')).toBeTruthy();
  });

  it('단계 없이 끝난 미실행은 서버 안내 문장을 그 칸에 둔다 — 값 창으로 돌아와도 까닭이 남는다', () => {
    const 결과: TrialResult = { status: 'NA', durationMs: 10, steps: [], error: { message: '러너에 닿지 못했습니다' } };
    render(<시험배지 칸들={[{ platform: 'desktop', 줄: { 종류: 'done', 결과 } }]} />);

    expect(screen.getByText('러너에 닿지 못했습니다')).toBeTruthy();
  });

  it('아직 안 돌렸으면 아무것도 그리지 않는다', () => {
    const { container } = render(<시험배지 칸들={undefined} />);

    expect(container.textContent).toBe('');
  });

  it('디바이스가 둘이면 칸마다 디바이스 이름을 달고, 하나면 이름 없이 결과만 둔다', () => {
    const 결과: TrialResult = { status: 'PASS', durationMs: 3000, steps: [] };
    const { container, rerender } = render(
      <시험배지 칸들={[{ platform: 'desktop', 줄: { 종류: 'done', 결과 } }, { platform: 'mobile', 줄: { 종류: 'run' } }]} />,
    );

    expect([...container.querySelectorAll('.trial-dev')].map((el) => el.textContent)).toEqual(['PC', '모바일']);
    expect(container.querySelectorAll('.trial-badge')[1]?.textContent).toBe('모바일실행 중');

    rerender(<시험배지 칸들={[{ platform: 'desktop', 줄: { 종류: 'run' } }]} />);
    expect(container.querySelector('.trial-dev')).toBeNull();
  });
});

describe('한 건 창의 테스트 실행', () => {
  const 끝: TrialResult = {
    status: 'FAIL',
    durationMs: 2300,
    steps: [
      { seq: 1, title: '로그인한다', status: 'PASS', durationMs: 100, assertions: [] },
      { seq: 2, title: '목록을 확인한다', status: 'FAIL', durationMs: 50, assertions: [], error: { message: '행이 없습니다' } },
    ],
  };

  it('끝나면 실패 카드 안에 절차마다의 판정 목록이 펼쳐지고 원문은 카드에 하나다', async () => {
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'DONE', result: 끝 });
    await 그린다();

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    시작누름('시험 실행 시작');

    await waitFor(() => expect(document.querySelector('.trial-res .trial-res-steps')).not.toBeNull(), { timeout: 5000 });
    const 카드 = within(document.querySelector('.trial-res li.bad') as HTMLElement);
    expect(카드.getByText('로그인한다', { selector: '.trial-res-steps span' })).toBeTruthy();
    expect(카드.getByText('목록을 확인한다', { selector: '.trial-res-steps span' }).closest('li')?.className).toBe('f');
    expect(카드.getAllByText('원문 보기')).toHaveLength(1);
    expect(카드.getByText('행이 없습니다', { selector: 'details pre' })).toBeTruthy();
  });

  it('디바이스를 다 끄면 시험 실행이 잠겨 보내지 않는다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial');
    await 그린다({ ...케이스, platforms: ['desktop', 'mobile'] });

    fireEvent.click(screen.getByRole('checkbox', { name: 'PC 1건' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '모바일 1건' }));
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    시작누름('시험 실행 시작');

    expect(시작).not.toHaveBeenCalled();
    expect(screen.getByText('실행할 디바이스를 하나 이상 선택하세요')).toBeTruthy();
  });

  it('고른 디바이스로 보낸다 — 첫째가 꺼져 있으면 남은 것으로 돈다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'DONE', result: { status: 'PASS', durationMs: 1, steps: [] } });
    await 그린다({ ...케이스, platforms: ['desktop', 'mobile'] });

    fireEvent.click(screen.getByRole('checkbox', { name: 'PC 1건' }));
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    시작누름('시험 실행 시작');

    await waitFor(() => expect(시작).toHaveBeenCalledTimes(1));
    expect(시작.mock.calls[0]?.[1]).toMatchObject({ platform: 'mobile' });
  });
});

describe('시험 실행 시작 확인', () => {
  it('1건이면 케이스 줄에 「한 건씩 차례로」를 붙이지 않는다', async () => {
    await 그린다();

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));

    const 확인 = screen.getByRole('dialog', { name: '시험 실행을 시작할까요?' });
    expect(확인.querySelector('.start-what dd')?.textContent).toBe('1건');
  });
});

describe('디바이스를 바꾼 뒤 남는 시험 결과', () => {
  it('끈 디바이스의 결과는 줄에서 걷는다 — PC 로 돈 결과가 모바일만 남긴 줄에 남지 않는다', async () => {
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    vi.spyOn(api, 'startTrial').mockImplementation((_tcId, body) => Promise.resolve({ trialId: `t-${body.platform}` }));
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'DONE', result: { status: 'PASS', durationMs: 2720, steps: [] } });
    const 둘 = { ...케이스, platforms: ['desktop', 'mobile'] as const };
    render(<RunPickModal 케이스들={[{ ...둘, platforms: [...둘.platforms] }, { ...둘, tcId: 'ZRS-002', platforms: [...둘.platforms] }]} service={서비스} onRun={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    시작누름('시험 실행 시작');
    fireEvent.click(await screen.findByRole('button', { name: '← 준비로 돌아가기' }, { timeout: 5000 }));
    expect(document.querySelectorAll('.trial-dev')).toHaveLength(4);

    fireEvent.click(screen.getByRole('checkbox', { name: 'PC 2건' }));

    expect(document.querySelectorAll('.trial-dev')).toHaveLength(0);
    expect(document.querySelectorAll('.trial-badge .verdict')).toHaveLength(2);
  });
});

describe('실행 창 오른쪽 실시간 칸', () => {
  it('테스트 실행을 누르기 전에는 칸이 없다', async () => {
    await 그린다();

    expect(document.querySelector('.trial-live')).toBeNull();
  });

  it('누르면 오른쪽에 그 케이스의 장면 칸이 열리고, VISION 이 폰을 잡으면 링크를 단다', async () => {
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'RUNNING', vision: { url: 'https://vision.example/#phone=R3C&view=k1' } });
    const 받기 = vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    await 그린다();

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    시작누름('시험 실행 시작');

    const 링크 = await screen.findByRole('link', { name: 'Device VISION 에서 보기 ↗' });
    expect(링크.getAttribute('href')).toBe('https://vision.example/#phone=R3C&view=k1');
    expect(document.querySelector('.trial-colR .trial-live')).not.toBeNull();
    // 케이스 이름은 대기열이 적는다 — 장면 칸 머리에 또 쓰지 않는다 (§8.16 ③ · 점검표 D2)
    expect(document.querySelector('.live-sub')?.textContent).toBe('서버 브라우저');
    expect(받기).toHaveBeenCalledWith('/api/cases/ZRS-001/test-run/t1/live');
  });

  it('모바일 웹 케이스는 VISION 이 폰을 잡으면 실제 폰 Chrome 폰 화면 칸으로 바뀌고 앱 단계라고 하지 않는다', async () => {
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't2' });
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'RUNNING', vision: { url: 'https://vision.example/#phone=R3C&view=k2' } });
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    await 그린다({ ...케이스, platforms: ['mobile'] });

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    시작누름('시험 실행 시작');

    expect(await screen.findByText('폰 화면을 기다리고 있습니다')).toBeTruthy();
    expect(screen.queryByText(/앱 단계/)).toBeNull();
  });

  it('결과를 못 받고 멈추면 놓였을 폰의 VISION 링크를 걷는다', async () => {
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial')
      .mockResolvedValueOnce({ status: 'RUNNING', vision: { url: 'https://vision.example/#phone=R3C&view=k1' } })
      .mockRejectedValue(new Error('서버가 답하지 않습니다'));
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    await 그린다();

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    시작누름('시험 실행 시작');

    expect(await screen.findByRole('link', { name: 'Device VISION 에서 보기 ↗' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Device VISION 에서 보기 ↗' })).toBeNull(), { timeout: 5000 });
  });

  it('여러 건이면 몇째인지 창 제목에 적고 지금 케이스는 대기열 줄이 진하게 가리킨다', async () => {
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'RUNNING' });
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    const 둘째 = { ...케이스, tcId: 'ZRS-002', name: '둘째 케이스' };
    render(<RunPickModal 케이스들={[케이스, 둘째]} service={서비스} onRun={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    시작누름('시험 실행 시작');

    expect(await screen.findByRole('dialog', { name: '시험 실행 · 1 / 2' })).toBeTruthy();
    expect(document.querySelector('.trial-queue li.cur .id')?.textContent).toBe('ZRS-001');
  });

  it('PC 와 모바일을 고른 케이스는 PC 다음 모바일을 돌고, 모바일 차례에 장면 칸이 가상 기기 폰 폭이 된다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial').mockImplementation((_tcId, body) => Promise.resolve({ trialId: `t-${body.platform}` }));
    vi.spyOn(api, 'getTrial').mockImplementation((_tcId, trialId) =>
      Promise.resolve(trialId === 't-desktop' ? { status: 'DONE', result: { status: 'PASS', durationMs: 1, steps: [] } } : { status: 'RUNNING' }),
    );
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    await 그린다({ ...케이스, platforms: ['desktop', 'mobile'] });

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    시작누름('시험 실행 시작');

    expect(await screen.findByRole('dialog', { name: '시험 실행 · 2 / 2' }, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('가상 기기 · iPhone 14')).toBeTruthy();
    expect(document.querySelector('.trial-run')?.classList.contains('phone')).toBe(true);
    expect(시작.mock.calls.map(([, body]) => body.platform)).toEqual(['desktop', 'mobile']);
  });
});
