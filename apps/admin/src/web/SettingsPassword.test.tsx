// @vitest-environment jsdom
// TempPassword 한 조각의 단위 검사 — 임시 비밀번호 상자가 끌어와지고 낭독기에 알려지는지 본다.
//
// 한계. jsdom 에는 레이아웃 엔진이 없다 — 폭·높이·스크롤 위치가 전부 0 이고
// scrollIntoView 는 아예 없어서 이 파일이 직접 끼워 넣은 뒤 「불렸다」를 본다.
// 그래서 **화면 밖에 그려졌는지는 여기서 볼 수 없다.** WS-E ③ 사고의 정체는
// 「판단은 맞았는데 배치가 틀렸다」였고 배치는 이 그물이 관측할 수 없는 축이다.
// 이 검사가 지키는 것은 「그 호출이 지워지지 않았다」는 회귀 못이지 「화면에 보인다」가 아니다 —
// 실제로 보이는지는 여전히 사람이 브라우저로 본다.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { TempPassword } from './SettingsPassword.js';

const 스크롤 = vi.fn();

// jsdom 에 없는 함수라 끼워 넣지 않으면 컴포넌트가 TypeError 로 죽는다.
// 원래 없던 자리이므로 걷을 때는 지운다 — 남기면 다른 검사 파일로 샌다
beforeAll(() => {
  Element.prototype.scrollIntoView = 스크롤;
});
afterAll(() => {
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다
afterEach(() => {
  cleanup();
  스크롤.mockClear();
});

const 것 = { username: 'kim', password: 'Tmp-a1b2c3' };

describe('TempPassword', () => {
  it('아이디와 임시 비밀번호가 문서에 있다', () => {
    render(<TempPassword 것={것} onClose={() => {}} />);

    expect(screen.queryByText('kim')).not.toBeNull();
    expect(screen.queryByText('Tmp-a1b2c3')).not.toBeNull();
  });

  it('그리자마자 화면 안으로 끌어온다', () => {
    render(<TempPassword 것={것} onClose={() => {}} />);

    expect(스크롤).toHaveBeenCalledTimes(1);
    expect(스크롤.mock.calls[0]?.[0]).toEqual({ block: 'center' });
  });

  it('포커스가 그 상자로 간다', () => {
    render(<TempPassword 것={것} onClose={() => {}} />);

    expect(document.activeElement).toBe(screen.getByRole('alert'));
  });

  it('낭독기에도 즉시 알린다', () => {
    render(<TempPassword 것={것} onClose={() => {}} />);
    const 상자 = screen.getByRole('alert');

    expect(상자.getAttribute('role')).toBe('alert');
    expect(상자.getAttribute('aria-live')).toBe('assertive');
  });

  it('다른 계정으로 또 만들면 다시 끌어온다', () => {
    const { rerender } = render(<TempPassword 것={것} onClose={() => {}} />);
    expect(스크롤).toHaveBeenCalledTimes(1);

    rerender(<TempPassword 것={{ username: 'lee', password: 'Tmp-d4e5f6' }} onClose={() => {}} />);

    expect(스크롤).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Tmp-d4e5f6')).not.toBeNull();
  });

  it('적었습니다를 누르면 onClose 가 불린다', () => {
    const 닫기 = vi.fn();
    render(<TempPassword 것={것} onClose={닫기} />);

    fireEvent.click(screen.getByText('적었습니다'));

    expect(닫기).toHaveBeenCalledTimes(1);
  });
});
