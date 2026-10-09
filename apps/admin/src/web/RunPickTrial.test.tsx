// @vitest-environment jsdom
// 실행 창의 「▶ 테스트 실행」 조각 — 열 주소 기본값 · 결과 배지 · 한 건 창의 절차 목록 (도메인/실행 §8.10)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type TrialResult } from './api.js';
import { 그린다, 케이스 } from './runPick.fixture.js';
import { 시험배지, 열주소기본값 } from './RunPickTrial.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('열주소기본값', () => {
  it('점 없는 Docker 안 이름은 localhost 로 바꾼다', () => {
    expect(열주소기본값('http://demo:3002')).toBe('http://localhost:3002');
    expect(열주소기본값('http://demo:3002/app?x=1')).toBe('http://localhost:3002/app?x=1');
  });

  it('점이 있는 호스트·localhost·IP 는 그대로다', () => {
    expect(열주소기본값('https://qa.example.com')).toBe('https://qa.example.com');
    expect(열주소기본값('http://localhost:3000')).toBe('http://localhost:3000');
    expect(열주소기본값('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
    expect(열주소기본값('http://[::1]:3000')).toBe('http://[::1]:3000');
  });

  it('주소가 없으면 빈 글자다', () => {
    expect(열주소기본값(null)).toBe('');
  });
});

describe('시험배지', () => {
  it('러너에 못 닿아 NA 로 끝나면 서버가 준 문장을 그대로 보인다', () => {
    const 결과: TrialResult = { status: 'NA', durationMs: 10, steps: [], error: { message: '내 컴퓨터 러너를 켜세요: npm run runner:local' } };
    render(<시험배지 줄={{ 종류: 'done', 결과 }} />);

    expect(screen.getByText('내 컴퓨터 러너를 켜세요: npm run runner:local')).toBeTruthy();
  });

  it('아직 안 돌렸으면 아무것도 그리지 않는다', () => {
    const { container } = render(<시험배지 줄={undefined} />);

    expect(container.textContent).toBe('');
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

  it('끝나면 절차마다의 판정 목록이 줄 아래에 펼쳐진다', async () => {
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'DONE', result: 끝 });
    await 그린다();

    fireEvent.change(screen.getByLabelText('열 주소'), { target: { value: 'http://localhost:3002' } });
    fireEvent.click(screen.getByRole('button', { name: '▶ 테스트 실행' }));

    await waitFor(() => expect(document.querySelector('.trial-steps')).not.toBeNull(), { timeout: 5000 });
    expect(screen.getByText('로그인한다')).toBeTruthy();
    expect(screen.getByText('목록을 확인한다').closest('li')?.className).toContain('fail');
    expect(screen.getByText('행이 없습니다', { selector: '.trial-step .err' })).toBeTruthy();
  });

  it('디바이스를 다 끄고 누르면 보내지 않고 사유를 보인다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial');
    await 그린다({ ...케이스, platforms: ['desktop', 'mobile'] });

    fireEvent.click(screen.getByRole('checkbox', { name: 'PC' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '모바일' }));
    fireEvent.click(screen.getByRole('button', { name: '▶ 테스트 실행' }));

    expect(시작).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('실행할 디바이스를 하나 이상 고르세요.');
  });

  it('고른 디바이스로 보낸다 — 첫째가 꺼져 있으면 남은 것으로 돈다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'DONE', result: { status: 'PASS', durationMs: 1, steps: [] } });
    await 그린다({ ...케이스, platforms: ['desktop', 'mobile'] });

    fireEvent.click(screen.getByRole('checkbox', { name: 'PC' }));
    fireEvent.change(screen.getByLabelText('열 주소'), { target: { value: 'http://localhost:3002' } });
    fireEvent.click(screen.getByRole('button', { name: '▶ 테스트 실행' }));

    await waitFor(() => expect(시작).toHaveBeenCalledTimes(1));
    expect(시작.mock.calls[0]?.[1]).toMatchObject({ platform: 'mobile' });
  });
});
