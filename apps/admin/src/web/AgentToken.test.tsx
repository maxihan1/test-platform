// @vitest-environment jsdom
// 설정 > 계정 편집의 에이전트 토큰 부품 검사 — 발급·다시 발급·취소와 한 번만 보이는 상자를 본다.
//
// 토큰 상자가 사는 자리는 UserSection 이다. 편집을 닫거나 목록을 다시 읽어도 상자가 살아 있어야
// 하므로 부품 하나가 아니라 UserSection 째로 그린다.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, ApiError, type UserRow } from './api.js';
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
    role: 'operator',
    isActive: true,
    services: [],
    hasAgentToken: false,
    isAuthoringAgent: false,
    ...덧,
  };
}

function 그리기(rows: UserRow[], onDone: () => void = () => {}) {
  const 결과 = render(
    <UserSection rows={rows} services={[]} me="kim" onDone={onDone} onSelf={() => {}} />,
  );
  fireEvent.click(screen.getAllByText('편집').at(-1)!);
  return 결과;
}

describe('에이전트 토큰', () => {
  it('작성 에이전트 계정이 아니면 아무것도 그리지 않는다', () => {
    그리기([계정('kim')]);

    expect(screen.queryByText('에이전트 토큰')).toBeNull();
    expect(screen.queryByText('발급')).toBeNull();
  });

  it('작성 계정이 바뀌어 토큰만 남은 계정에는 취소만 보인다 — 안 보이면 남은 토큰을 아무도 못 지운다', () => {
    그리기([계정('old', { hasAgentToken: true })]);

    expect(screen.queryByText('토큰 취소')).not.toBeNull();
    expect(screen.queryByText('다시 발급')).toBeNull();
    expect(screen.queryByText('발급')).toBeNull();
  });

  it('비활성인 작성 에이전트 계정에도 그리지 않는다', () => {
    그리기([계정('agent', { isAuthoringAgent: true, isActive: false })]);

    expect(screen.queryByText('에이전트 토큰')).toBeNull();
  });

  it('토큰이 없으면 한 번 눌러 발급하고 상자에 토큰이 뜬다', async () => {
    const 발급 = vi.spyOn(api, 'issueAgentToken').mockResolvedValue({ agentToken: 'agt-123' });
    그리기([계정('agent', { isAuthoringAgent: true })]);

    expect(screen.queryByText('토큰 없음')).not.toBeNull();
    fireEvent.click(screen.getByText('발급'));

    const 상자 = await screen.findByRole('alert');
    expect(발급).toHaveBeenCalledWith('agent');
    expect(상자.querySelector('code')?.textContent).toBe('agt-123');
    expect(상자.textContent).toContain('다시 볼 수 없습니다');
  });

  it('목록을 다시 읽고 편집이 닫혀도 토큰 상자는 남는다', async () => {
    vi.spyOn(api, 'issueAgentToken').mockResolvedValue({ agentToken: 'agt-123' });
    const onDone = vi.fn();
    const { rerender } = 그리기([계정('agent', { isAuthoringAgent: true })], onDone);

    fireEvent.click(screen.getByText('발급'));
    await screen.findByRole('alert');
    expect(onDone).toHaveBeenCalled();

    rerender(
      <UserSection
        rows={[계정('agent', { isAuthoringAgent: true, hasAgentToken: true })]}
        services={[]}
        me="kim"
        onDone={onDone}
        onSelf={() => {}}
      />,
    );
    fireEvent.click(screen.getByText('닫기'));

    expect(screen.getByRole('alert').textContent).toContain('agt-123');
    fireEvent.click(screen.getByText('적었습니다'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('토큰이 있으면 다시 발급은 결과를 말하는 확인 줄을 거치고 그만두기는 API 를 안 부른다', async () => {
    const 발급 = vi.spyOn(api, 'issueAgentToken').mockResolvedValue({ agentToken: 'agt-new' });
    그리기([계정('agent', { isAuthoringAgent: true, hasAgentToken: true })]);

    expect(screen.queryByText('토큰 있음')).not.toBeNull();
    fireEvent.click(screen.getByText('다시 발급'));
    expect(screen.queryByText(/맥 에이전트가 지금 멈춥니다/)).not.toBeNull();
    fireEvent.click(screen.getByText('그만두기'));
    expect(screen.queryByText(/맥 에이전트가 지금 멈춥니다/)).toBeNull();
    expect(발급).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('다시 발급'));
    fireEvent.click(screen.getByText('다시 발급한다'));
    const 상자 = await screen.findByRole('alert');
    expect(상자.textContent).toContain('agt-new');
  });

  it('취소도 확인 줄을 거치고 확정하면 DELETE 를 부른다', async () => {
    const 취소 = vi.spyOn(api, 'revokeAgentToken').mockResolvedValue(undefined);
    const onDone = vi.fn();
    그리기([계정('agent', { isAuthoringAgent: true, hasAgentToken: true })], onDone);

    fireEvent.click(screen.getByText('토큰 취소'));
    expect(screen.queryByText(/맥 에이전트가 지금 멈춥니다/)).not.toBeNull();
    fireEvent.click(screen.getByText('그만두기'));
    expect(취소).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('토큰 취소'));
    await act(async () => {
      fireEvent.click(screen.getByText('취소한다'));
    });
    expect(취소).toHaveBeenCalledWith('agent');
    expect(onDone).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('보내는 중에는 버튼이 눌리지 않는다', () => {
    vi.spyOn(api, 'issueAgentToken').mockReturnValue(new Promise(() => {}));
    그리기([계정('agent', { isAuthoringAgent: true })]);

    const 버튼 = screen.getByText('발급') as HTMLButtonElement;
    fireEvent.click(버튼);

    expect(버튼.disabled).toBe(true);
  });

  it('API 가 실패하면 .err 줄에 사유가 뜬다', async () => {
    vi.spyOn(api, 'issueAgentToken').mockRejectedValue(
      new ApiError(400, 'NOT_AUTHORING_AGENT', '', []),
    );
    const { container } = 그리기([계정('agent', { isAuthoringAgent: true })]);

    await act(async () => {
      fireEvent.click(screen.getByText('발급'));
    });

    expect(container.querySelector('.err')?.textContent).toContain('NOT_AUTHORING_AGENT');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
