// @vitest-environment jsdom
// 목록 한 줄의 상세 창 틀 — 주소 복사 · Tab 가두기 · 이전/다음 계산 (DESIGN.md 「상세 창」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { DetailModal, 옆열기 } from './DetailModal.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 클립보드(writeText: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value: writeText === undefined ? undefined : { writeText }, configurable: true });
}

function 그린다(over: Partial<React.ComponentProps<typeof DetailModal>> = {}) {
  return render(
    <DetailModal
      id="t"
      위치={['기능 테스트']}
      번호="ZZD-001"
      제목="상세 케이스"
      onClose={() => {}}
      왼쪽={<p>왼쪽 글</p>}
      오른쪽={
        <>
          <button type="button">보이는 단추</button>
          <details>
            <summary>접힌 상자</summary>
            <input aria-label="숨은 칸" />
          </details>
        </>
      }
      {...over}
    />,
  );
}

describe('상세 창 — 주소 복사', () => {
  it('주소를 안 주면 # 뒤까지 지금 주소를 그대로 복사하고 알린다', async () => {
    window.location.hash = '#/cases/fn?case=ZZD-001';
    const 쓰기 = vi.fn().mockResolvedValue(undefined);
    클립보드(쓰기);
    그린다();

    fireEvent.click(screen.getByRole('button', { name: '주소 복사' }));

    expect(await screen.findByText('주소를 복사했습니다')).toBeTruthy();
    expect(쓰기).toHaveBeenCalledWith(window.location.href);
    expect(String(쓰기.mock.calls[0]![0])).toContain('#/cases/fn?case=ZZD-001');
  });

  it('# 주소를 주면 지금 주소에 붙여 완성한다', async () => {
    const 쓰기 = vi.fn().mockResolvedValue(undefined);
    클립보드(쓰기);
    그린다({ 주소: '#/prd/MKT-REQ-031' });

    fireEvent.click(screen.getByRole('button', { name: '주소 복사' }));

    await screen.findByText('주소를 복사했습니다');
    expect(쓰기).toHaveBeenCalledWith(`${window.location.origin}${window.location.pathname}#/prd/MKT-REQ-031`);
  });

  it('클립보드가 없으면(http 로 연 서버) 복사하지 못했다고 알린다', async () => {
    클립보드(undefined);
    그린다();

    fireEvent.click(screen.getByRole('button', { name: '주소 복사' }));

    expect(await screen.findByText('주소를 복사하지 못했습니다')).toBeTruthy();
  });
});

describe('상세 창 — Tab 은 창 안에서 돈다', () => {
  it('접힌 상자 안 칸은 건너뛰어 마지막 칸은 접힌 상자의 머리다. 거기서 Tab 은 첫 단추로 돈다', () => {
    그린다();
    const 머리 = screen.getByText('접힌 상자');
    머리.focus();
    expect(document.activeElement).toBe(머리);

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: '주소 복사' }));
  });

  it('창 자체에서 Shift+Tab 은 마지막 칸(접힌 상자 머리)으로 간다 — 숨은 칸으로 가지 않는다', () => {
    그린다();
    expect(document.activeElement).toBe(screen.getByRole('dialog'));

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(screen.getByText('접힌 상자'));
  });

  it('포커스가 창 밖으로 빠졌으면 Shift+Tab 도 창 안으로 돌려 놓는다', () => {
    그린다();
    (document.activeElement as HTMLElement).blur();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });
});

describe('옆열기 — 이전 · 다음', () => {
  it('목록에서 앞 · 뒤 것을 열고, 처음 · 끝이거나 목록에 없으면 없다', () => {
    const 열기 = vi.fn();
    const 목록 = ['a', 'b', 'c'];

    옆열기(목록, 'b', 1, 열기)!();
    옆열기(목록, 'b', -1, 열기)!();

    expect(열기.mock.calls).toEqual([['c'], ['a']]);
    expect(옆열기(목록, 'c', 1, 열기)).toBeUndefined();
    expect(옆열기(목록, 'a', -1, 열기)).toBeUndefined();
    expect(옆열기(목록, 'x', 1, 열기)).toBeUndefined();
    expect(옆열기(목록, undefined, 1, 열기)).toBeUndefined();
  });
});
