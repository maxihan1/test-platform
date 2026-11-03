// @vitest-environment jsdom
// 실행 위치 덩이 검사 (SPEC §8.2) — 앱 정식 실행은 늘 디바이스 팜이라 안내 한 줄, 모바일 웹만 서버 흉내 · 실제 폰을 고른다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { RunLocation } from './RunLocation.js';

afterEach(() => {
  cleanup();
});

describe('RunLocation', () => {
  it('Android 앱도 모바일도 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<RunLocation android={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('Android 앱이 있으면 「Android 앱 · Device VISION」 줄이고 고르개가 아니다', () => {
    render(<RunLocation android />);

    expect([screen.getByText('Android 앱'), screen.getByText('Device VISION')].every(Boolean)).toBe(true);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByText(/로컬/)).toBeNull();
    expect(screen.queryByText('준비 중')).toBeNull();
  });

  it('모바일 웹 줄은 서버 흉내 · 실제 폰 둘 중 하나를 고르고, 실제 폰이면 팜이 하는 일을 덧붙인다', () => {
    const on바꿈 = vi.fn();
    const { rerender } = render(<RunLocation android={false} 모바일={{ 값: 'server', on바꿈 }} />);

    expect((screen.getByRole('radio', { name: '서버 (iPhone 14 흉내)' }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText(/빈 폰을 하나씩/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Device VISION (실제 폰 Chrome)' }));
    expect(on바꿈).toHaveBeenCalledWith('vision');

    rerender(<RunLocation android={false} 모바일={{ 값: 'vision', on바꿈 }} />);
    expect((screen.getByRole('radio', { name: 'Device VISION (실제 폰 Chrome)' }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('케이스마다 빈 폰을 하나씩 잡고 끝나면 놓습니다. 화면 영상과 logcat 은 통과하지 못한 항목에 남습니다')).toBeTruthy();
  });

  it('둘이 한 화면에 서도 라디오 묶음이 섞이지 않는다', () => {
    render(
      <>
        <RunLocation android={false} 모바일={{ 값: 'server', on바꿈: () => {} }} />
        <RunLocation android={false} 모바일={{ 값: 'vision', on바꿈: () => {} }} />
      </>,
    );

    const 묶음 = screen.getAllByRole('radiogroup', { name: '모바일 웹' });
    const 고른것 = (g: HTMLElement) => g.querySelector<HTMLInputElement>('input:checked')?.parentElement?.textContent;
    expect(묶음.map(고른것)).toEqual(['서버 (iPhone 14 흉내)', 'Device VISION (실제 폰 Chrome)']);
    expect(new Set(묶음.map((g) => g.querySelector('input')?.getAttribute('name'))).size).toBe(2);
  });
});
