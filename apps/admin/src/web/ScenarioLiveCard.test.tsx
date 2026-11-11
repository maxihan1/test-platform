// @vitest-environment jsdom
// E2E 정식 실행 결과 화면의 화면 카드 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」 · WEB-F9-12)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { E2E화면카드 } from './ScenarioLiveCard.js';
import { 장면통로 } from './TrialLive.js';

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:1') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function 흘리기() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('E2E 화면 카드', () => {
  it('장면이 있으면 그 실행의 장면 통로에서 받은 그림을 서버 브라우저 칸에 그린다', async () => {
    const 받기 = vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'frame', 그림: new Blob(['jpeg']) });

    render(<E2E화면카드 runId={77} platform="desktop" live />);
    await 흘리기();

    expect(받기).toHaveBeenCalledWith('/api/runs/77/scenario/live');
    expect(screen.getByRole('img', { name: '지금 화면' }).getAttribute('src')).toBe('blob:1');
    expect(document.querySelector('.lc-tag')?.textContent).toBe('서버 브라우저');
    expect(document.querySelector('.lc-phone')).toBeNull();
  });

  it('첫 장면 전에는 기다린다고 알리고 모바일은 폰 모양 칸이다', async () => {
    vi.spyOn(장면통로, '받기').mockResolvedValueOnce({ 종류: 'empty' }).mockResolvedValue({ 종류: 'frame', 그림: new Blob(['jpeg']) });

    render(<E2E화면카드 runId={77} platform="mobile" live />);
    await 흘리기();
    expect(screen.getByText('화면을 기다리고 있습니다')).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(document.querySelector('.live-shot.lc-phone')).not.toBeNull();
    expect(document.querySelector('.lc-tag')?.textContent).toBe('가상 디바이스 · iPhone 14');
  });

  it('실제 폰 Chrome 실행은 폰 Chrome 장면을 「실제 디바이스」 폰 칸에 그린다', async () => {
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'frame', 그림: new Blob(['jpeg']) });

    render(<E2E화면카드 runId={77} platform="mobile" live vision={{ url: 'https://vision.example.com/#phone=s1' }} />);
    await 흘리기();

    expect(document.querySelector('.live-shot.lc-phone img')).not.toBeNull();
    expect(document.querySelector('.lc-tag')?.textContent).toBe('실제 디바이스');
  });

  it('앱 · 게임 단계의 폰 장면(PNG)은 「실제 디바이스」 폰 칸에 그린다', async () => {
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'frame', 그림: new Blob(['png'], { type: 'image/png' }) });

    render(<E2E화면카드 runId={77} platform="android" live vision={{ url: 'https://vision.example.com/#phone=s1' }} />);
    await 흘리기();

    expect(document.querySelector('.live-shot.lc-phone img')).not.toBeNull();
    expect(document.querySelector('.lc-tag')?.textContent).toBe('실제 디바이스');
  });

  it('장면 열쇠가 없는 실행(admin 이 다시 뜸)은 Device VISION 링크만 서고 장면을 묻지 않는다', async () => {
    const 받기 = vi.spyOn(장면통로, '받기');

    render(<E2E화면카드 runId={77} platform="mobile" live={false} vision={{ url: 'https://vision.example.com/#phone=s1' }} />);
    await 흘리기();

    expect(screen.getByRole('link', { name: 'Device VISION ↗' }).getAttribute('href')).toBe('https://vision.example.com/#phone=s1');
    expect(document.querySelector('.lc-tag')?.textContent).toBe('실제 디바이스');
    expect(document.querySelector('.lc-scene')).toBeNull();
    expect(받기).not.toHaveBeenCalled();
  });

  it('앱 단계가 섞여 폰을 쥔 실행은 웹 장면을 그대로 서버 브라우저로 적고, 앱 단계에 들면 흐리게 두고 폰에서 돈다고 알린다', async () => {
    vi.spyOn(장면통로, '받기').mockResolvedValueOnce({ 종류: 'frame', 그림: new Blob(['jpeg']) }).mockResolvedValue({ 종류: 'empty' });

    render(<E2E화면카드 runId={77} platform="desktop" live vision={{ url: 'https://vision.example.com/#phone=s1' }} />);
    await 흘리기();
    expect(document.querySelector('.lc-tag')?.textContent).toBe('서버 브라우저');
    expect(document.querySelector('.live-shot.dim')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(document.querySelector('.live-shot.dim')).not.toBeNull();
    expect(screen.getByText('지금은 앱 단계라 디바이스에서 실행 중입니다')).toBeTruthy();
  });

  it('android 시나리오의 웹 단계는 PC 창이라 꼬리표가 없다', () => {
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });

    render(<E2E화면카드 runId={77} platform="android" live vision={{ url: 'https://vision.example.com/#phone=s1' }} />);

    expect(document.querySelector('.lc-tag')).toBeNull();
  });

  it('장면도 폰도 없으면 카드를 그리지 않는다 — 웹 단계가 없는 실행 · 서버가 다시 뜬 실행', () => {
    render(<E2E화면카드 runId={77} platform="desktop" live={false} />);

    expect(document.querySelector('.lc')).toBeNull();
  });
});
