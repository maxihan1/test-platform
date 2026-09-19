// @vitest-environment jsdom
// Modal 한 조각의 단위 검사 — 열면 제목이 화면에 붙는지 본다

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Modal } from './Modal.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다 —
// 안 걷으면 앞 검사의 모달이 document 에 남아 keydown 리스너가 겹쳐서 Escape 한 번이 여럿을 닫는다
afterEach(cleanup);

describe('Modal', () => {
  it('열면 제목이 문서에 있다', () => {
    render(
      <Modal 제목="정말 지울까요" onClose={() => {}} 버튼={<button type="button">확인</button>}>
        되돌릴 수 없습니다
      </Modal>,
    );

    expect(screen.queryByText('정말 지울까요')).not.toBeNull();
  });
});
