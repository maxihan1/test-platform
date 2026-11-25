// @vitest-environment jsdom
// 되돌리기 어려운 동작의 확인 상자 · 두 번 누르는 삭제 단추 검사 (DESIGN.md 「모달」 ①)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { 두번삭제, 확인창 } from './ConfirmBox.js';

afterEach(cleanup);

describe('확인창', () => {
  it('첫 포커스는 「취소」이고 Esc 는 하지 않고 닫는다', () => {
    const 닫기 = vi.fn();
    const 한다 = vi.fn();
    render(
      <확인창 제목="승인할까요?" 확인="승인" onClose={닫기} on확인={한다}>
        <p>취소할 수 없습니다</p>
      </확인창>,
    );
    expect(document.activeElement?.textContent).toBe('취소');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(닫기).toHaveBeenCalledTimes(1);
    expect(한다).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    expect(한다).toHaveBeenCalledTimes(1);
  });
});

describe('두번삭제', () => {
  it('한 번 누르면 「삭제 확인」으로 바뀌고, 다시 눌러야 지운다', () => {
    const 지움 = vi.fn();
    render(<두번삭제 라벨="1번째 목표 삭제" on삭제={지움} />);
    fireEvent.click(screen.getByRole('button', { name: '1번째 목표 삭제' }));
    expect(지움).not.toHaveBeenCalled();
    const 확인 = screen.getByRole('button', { name: '1번째 목표 삭제 · 삭제 확인' });
    expect(확인.textContent).toBe('삭제 확인');
    fireEvent.click(확인);
    expect(지움).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button').textContent).toBe('삭제');
  });

  it('더블클릭 한 번으로는 지워지지 않고, 다른 데를 누르면 처음으로 돌아온다', () => {
    const 지움 = vi.fn();
    render(<두번삭제 라벨="삭제" on삭제={지움} />);
    fireEvent.click(screen.getByRole('button'), { detail: 1 });
    fireEvent.click(screen.getByRole('button'), { detail: 2 });
    expect(지움).not.toHaveBeenCalled();
    expect(screen.getByRole('button').textContent).toBe('삭제 확인');
    fireEvent.blur(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('삭제');
  });
});
