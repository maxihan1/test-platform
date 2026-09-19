// @vitest-environment jsdom
// Modal 한 조각의 단위 검사 — 뼈대가 dialog 이고 이름이 제목과 같은가, 닫는 길 셋(버튼·Escape·바깥)이
// 다 여는가, 상자 안에서 시작한 누르기는 안 닫는가, Tab 이 상자 안을 도는가, 닫으면 포커스가 제자리로 오는가
//
// 한계. jsdom 에는 레이아웃도 CSS 계산도 없어 배치·간격·색·애니메이션은 여기서 못 본다.
// 그건 사람이 브라우저로 본다 (SPEC §9.1). 「덮개가 뒤를 가린다」도 그래서 여기서는 못 본다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';

import { Modal } from './Modal.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다 —
// 안 걷으면 앞 검사의 모달이 document 에 남아 keydown 리스너가 겹쳐서 Escape 한 번이 여럿을 닫는다
afterEach(cleanup);

// 상자 안 포커스 가능한 것이 셋이다 — 처음(입력칸) · 가운데(취소) · 끝(확인).
// 처음과 끝이 달라야 Tab 이 도는 것을 볼 수 있다
function 그리기(onClose: () => void) {
  return render(
    <Modal
      제목="정말 지울까요"
      onClose={onClose}
      버튼={
        <>
          <button type="button">취소</button>
          <button type="button" onClick={onClose}>
            확인
          </button>
        </>
      }
    >
      <input aria-label="확인 문구" />
    </Modal>,
  );
}

describe('Modal', () => {
  it('열면 제목이 문서에 있다', () => {
    그리기(() => {});

    expect(screen.queryByText('정말 지울까요')).not.toBeNull();
  });

  it('뼈대가 dialog 이고 이름이 제목과 같다', () => {
    그리기(() => {});

    const 상자 = screen.getByRole('dialog');
    expect(상자.getAttribute('aria-modal')).toBe('true');
    expect(상자.getAttribute('aria-label')).toBe('정말 지울까요');
  });

  it('닫는 길 하나 — 버튼을 누르면 onClose 를 부른다', () => {
    const onClose = vi.fn();
    그리기(onClose);

    fireEvent.click(screen.getByText('확인'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('닫는 길 둘 — Escape 를 누르면 onClose 를 부른다', () => {
    const onClose = vi.fn();
    그리기(onClose);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('닫는 길 셋 — 바깥을 누르면 onClose 를 부른다', () => {
    const onClose = vi.fn();
    const { container } = 그리기(onClose);

    fireEvent.mouseDown(container.querySelector('.modal-back')!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('상자 안에서 시작한 누르기는 닫지 않는다', () => {
    const onClose = vi.fn();
    그리기(onClose);

    fireEvent.mouseDown(screen.getByRole('dialog'));
    fireEvent.mouseDown(screen.getByText('정말 지울까요'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('끝에서 Tab 을 누르면 처음으로 돌고 기본 이동을 막는다', () => {
    그리기(() => {});
    const 처음 = screen.getByLabelText('확인 문구');
    const 끝 = screen.getByText('확인');

    끝.focus();
    const 탭 = createEvent.keyDown(document, { key: 'Tab' });
    fireEvent(document, 탭);

    expect(탭.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(처음);
  });

  it('처음에서 Shift+Tab 을 누르면 끝으로 돌고 기본 이동을 막는다', () => {
    그리기(() => {});
    const 처음 = screen.getByLabelText('확인 문구');
    const 끝 = screen.getByText('확인');

    처음.focus();
    const 탭 = createEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    fireEvent(document, 탭);

    expect(탭.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(끝);
  });

  it('닫으면 열기 전 있던 자리로 포커스가 돌아온다', () => {
    const 열기전 = document.createElement('button');
    document.body.appendChild(열기전);
    열기전.focus();

    const { unmount } = 그리기(() => {});
    expect(document.activeElement).not.toBe(열기전);

    unmount();

    expect(document.activeElement).toBe(열기전);
    열기전.remove();
  });
});
