// @vitest-environment jsdom
// 애플리케이션 설정에 적다 만 칸을 두고 떠날 때 묻는지 보는 검사

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { useHash, 떠나기막기 } from './leaveGuard.js';
import { ServicePanel } from './SettingsService.js';
import { 서비스 } from './SettingsService.fixture.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
});

function 주소보기() {
  return <p data-testid="hash">{useHash()}</p>;
}

async function 옮긴다(해시: string) {
  const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
  await act(async () => {
    window.location.hash = 해시;
    await 도착;
  });
}

describe('적다 만 애플리케이션 칸 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」 · 점검 14.1)', () => {
  it('고친 칸이 있으면 다른 주소로 가기 전에 묻고, 머무르면 칸이 그대로다', async () => {
    window.history.replaceState(null, '', '#/settings/ZSS');
    render(
      <>
        <주소보기 />
        <ServicePanel row={서비스} onDone={() => {}} />
      </>,
    );
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '고친 이름' } });
    await 옮긴다('#/settings/users');

    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    expect(screen.getByTestId('hash').textContent).toBe('#/settings/ZSS');
    fireEvent.click(screen.getByRole('button', { name: '머무르기' }));
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('고친 이름');
  });

  it('안 고쳤으면 묻지 않는다', async () => {
    window.history.replaceState(null, '', '#/settings/ZSS');
    render(
      <>
        <주소보기 />
        <ServicePanel row={서비스} onDone={() => {}} />
      </>,
    );
    await 옮긴다('#/settings/users');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('hash').textContent).toBe('#/settings/users');
  });
});

