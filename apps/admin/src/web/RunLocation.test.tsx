// @vitest-environment jsdom
// 실행 위치 고르개 검사 (SPEC §8.2) — 시안 A. 디바이스 팜은 아직 없어 막아 두고 「준비 중」을 글자로 보인다

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { RunLocation } from './RunLocation.js';

afterEach(() => {
  cleanup();
});

describe('RunLocation', () => {
  it('Android 앱이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<RunLocation android={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('Android 앱이 있으면 로컬이 골라져 있고 디바이스 팜은 고를 수 없다', () => {
    render(<RunLocation android />);

    expect(screen.getByText('실행 위치')).toBeTruthy();
    expect((screen.getByLabelText('로컬') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('디바이스 팜') as HTMLInputElement).disabled).toBe(true);
  });

  it('「준비 중」이 title 이 아니라 화면 글자로 보이고 디바이스 팜 라디오가 그것을 가리킨다', () => {
    render(<RunLocation android />);

    const 글자 = screen.getByText('준비 중');
    const 팜 = screen.getByLabelText('디바이스 팜');
    expect(팜.getAttribute('aria-describedby')).toBe(글자.id);
  });
});
