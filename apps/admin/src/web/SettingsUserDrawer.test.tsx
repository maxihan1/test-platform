// @vitest-environment jsdom
// 설정 > 계정 서랍 검사 — 줄을 바꿔 열 때 남은 상태 · 한 번만 보이는 상자 자리 · 아이디 `new` 계정 (WEB-F5-06)

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type UserRow } from './api.js';
import { UserSection } from './SettingsUser.js';

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterAll(() => {
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 계정(username: string, 덧: Partial<UserRow> = {}): UserRow {
  return {
    username,
    displayName: username,
    role: 'member',
    dashboard: 'read',
    isActive: true,
    projects: [],
    hasAgentToken: false,
    isAuthoringAgent: false,
    ...덧,
  };
}

function 그리기(rows: UserRow[]) {
  return render(<UserSection rows={rows} projects={[]} me="kim" onDone={() => {}} onSelf={() => {}} />);
}

const 줄열기 = (username: string) => fireEvent.click(screen.getByText(username, { selector: '.set-row > .set-sub' }));
const 서랍 = () => screen.getByRole('complementary');

describe('계정 서랍', () => {
  it('토큰 취소 확인 줄은 다른 계정으로 바꿔 열면 사라진다 — 남으면 바꿔 연 계정의 토큰이 취소된다', () => {
    const 취소 = vi.spyOn(api, 'revokeAgentToken').mockResolvedValue(undefined);
    그리기([계정('agent', { isAuthoringAgent: true, hasAgentToken: true }), 계정('old', { hasAgentToken: true })]);

    줄열기('agent');
    fireEvent.click(screen.getByText('토큰 취소'));
    expect(screen.queryByText('취소한다')).not.toBeNull();

    줄열기('old');
    expect(screen.queryByText('취소한다')).toBeNull();
    expect(취소).not.toHaveBeenCalled();
  });

  it('그 계정의 서랍이 열려 있으면 임시 비밀번호는 서랍 안에 뜨고, 다른 계정으로 바꾸면 서랍 밖으로 나온다', async () => {
    vi.spyOn(api, 'resetPassword').mockResolvedValue({ tempPassword: 'Tmp-a1b2c3' });
    그리기([계정('kim'), 계정('lee'), 계정('park')]);

    줄열기('lee');
    const 다시만들기 = screen.getByText('비밀번호 재발급');
    fireEvent.click(다시만들기);
    fireEvent.click(다시만들기);
    expect((await within(서랍()).findByRole('alert')).textContent).toContain('Tmp-a1b2c3');

    줄열기('park');
    expect(within(서랍()).queryByRole('alert')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('lee');
  });

  it('아이디가 new 인 계정이 있어도 「+」는 새 계정 폼을 연다', () => {
    그리기([계정('kim'), 계정('new')]);

    fireEvent.click(screen.getByLabelText('추가'));

    expect(within(서랍()).getByText('새 계정')).toBeTruthy();
    expect(within(서랍()).getByText('계정 추가')).toBeTruthy();
  });

  it('고치는 중인 줄에 표시가 붙는다', () => {
    const { container } = 그리기([계정('kim'), 계정('lee')]);

    줄열기('lee');

    expect([...container.querySelectorAll('.set-user-row.is-open')].map((it) => it.textContent)).toEqual([
      expect.stringContaining('lee'),
    ]);
  });
});
