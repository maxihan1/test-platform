// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { ServicePanel } from './SettingsService.js';
import { 물음누름 } from './startConfirm.fixture.js';
import { 그린다, 서비스 } from './SettingsService.fixture.js';
import { 탭열기 } from './SettingsTabs.fixture.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
});

describe('탐색 제외 경로 칸 (도메인/인증 §8.8 · 2026-10-04)', () => {
  it('칸이 보이고, 두 줄을 적어 저장하면 crawlExclude 배열로 보낸다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    그린다();
    탭열기('테스트 작성');

    fireEvent.change(screen.getByLabelText('탐색 제외 경로'), { target: { value: '/daejeon\n /gyeongnam/ \n' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]).toMatchObject({ crawlExclude: ['/daejeon', '/gyeongnam'] });
  });

  it('있던 값이 한 줄에 하나씩 채워져 보인다', () => {
    render(<ServicePanel row={{ ...서비스, crawlExclude: ['/daejeon', '/gyeongnam'] }} onDone={() => {}} />);
    탭열기('테스트 작성');

    expect((screen.getByLabelText('탐색 제외 경로') as HTMLTextAreaElement).value).toBe('/daejeon\n/gyeongnam');
  });

  it('/ 로 시작하지 않는 줄이 있으면 저장 버튼 아래에 이유를 말하고 보내지 않는다', () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    그린다();
    탭열기('테스트 작성');

    fireEvent.change(screen.getByLabelText('탐색 제외 경로'), { target: { value: 'daejeon' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('.set-why')?.textContent).toContain('「daejeon」');
    expect(고침).not.toHaveBeenCalled();
  });

});

describe('프로시저 작성 칸 (도메인/실행 「프로시저 작성 스위치」)', () => {
  it('웹 애플리케이션에는 칸이 없고 Android 앱 · 게임에는 있다', () => {
    const 웹 = render(<ServicePanel row={서비스} onDone={() => {}} />);
    탭열기('테스트 작성');
    expect(screen.queryByLabelText('테스트 프로시저로 작성')).toBeNull();
    웹.unmount();
    for (const kind of ['APP', 'GAME'] as const) {
      const 그림 = render(<ServicePanel row={{ ...서비스, kind }} onDone={() => {}} />);
      탭열기('테스트 작성');
      expect((screen.getByLabelText('테스트 프로시저로 작성') as HTMLInputElement).checked).toBe(false);
      그림.unmount();
    }
  });

  it('체크하고 저장하면 procedureMode: true 가 가고, 안 건드리면 안 간다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={{ ...서비스, kind: 'APP' }} onDone={() => {}} />);
    탭열기('테스트 작성');

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');
    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]).not.toHaveProperty('procedureMode');

    fireEvent.click(screen.getByLabelText('테스트 프로시저로 작성'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');
    await waitFor(() => expect(고침).toHaveBeenCalledTimes(2));
    expect(고침.mock.calls[1]?.[1]).toMatchObject({ procedureMode: true });
  });

  it('켜져 있던 것을 끄고 저장하면 procedureMode: false 가 간다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={{ ...서비스, kind: 'GAME', procedureMode: true }} onDone={() => {}} />);
    탭열기('테스트 작성');
    expect((screen.getByLabelText('테스트 프로시저로 작성') as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByLabelText('테스트 프로시저로 작성'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');
    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]).toMatchObject({ procedureMode: false });
  });

  it('사용 중이라 서버가 409 로 막으면 까닭을 한국어로 보여 준다', async () => {
    vi.spyOn(api, 'updateService').mockRejectedValue(new ApiError(409, 'PROCEDURE_IN_USE', ''));
    render(<ServicePanel row={{ ...서비스, kind: 'APP', procedureMode: true }} onDone={() => {}} />);
    탭열기('테스트 작성');

    fireEvent.click(screen.getByLabelText('테스트 프로시저로 작성'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');
    expect(await screen.findByText('테스트 프로시저로 작성한 케이스가 있어 끌 수 없습니다')).toBeTruthy();
  });
});
