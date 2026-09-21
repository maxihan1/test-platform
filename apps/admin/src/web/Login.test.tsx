// @vitest-environment jsdom
// 로그인 화면 검사 (SPEC §8.6, 2026-09-22 신설).
//
// **이 화면에는 그물이 없었다.** 그런데 여기에는 보안 규칙이 하나 걸려 있다 —
// **틀렸을 때 어느 쪽이 틀렸는지 말하지 않는다.** 「아이디가 없습니다」라고 적으면
// 아이디가 있는지를 바깥에서 하나씩 캐낼 수 있다. 서버도 같은 이유로 401 하나만 준다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError } from './api.js';
import { Login } from './Login.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 그리기() {
  return render(<Login onLogin={() => undefined} />);
}

async function 틀리게친다(status: number) {
  vi.spyOn(api, 'login').mockRejectedValue(new ApiError(status, 'UNAUTHORIZED', '아이디가 없습니다'));
  const 것 = 그리기();
  fireEvent.change(screen.getByLabelText('아이디'), { target: { value: '없는사람' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'x' } });
  fireEvent.submit(screen.getByRole('button', { name: '로그인' }));
  return 것;
}

describe('로그인 화면', () => {
  it('제품 이름과 맞이 문장이 있다', () => {
    그리기();

    expect(screen.getByText('테스트 플랫폼')).toBeTruthy();
    // 들어가는 자리임을 분명히 한다. 빈 상자 하나만 두면 무엇을 하는 화면인지 안 읽힌다
    expect(screen.getByText(/맡은 서비스가 열립니다/)).toBeTruthy();
  });

  it('비밀번호 칸은 가려서 입력받는다', () => {
    그리기();

    expect(screen.getByLabelText('비밀번호').getAttribute('type')).toBe('password');
  });

  it('틀렸을 때 어느 쪽이 틀렸는지 말하지 않는다', async () => {
    await 틀리게친다(401);

    const 사유 = await screen.findByText(/맞지 않습니다/);
    // 서버가 준 문장을 그대로 쓰면 아이디의 존재가 새어 나간다 (SPEC §8.6)
    expect(사유.textContent).not.toContain('아이디가 없습니다');
    expect(사유.textContent).toContain('아이디 또는 비밀번호');
  });

  it('401 이 아닌 오류는 그대로 보여준다 — 서버가 죽은 것을 로그인 실패로 읽게 하지 않는다', async () => {
    await 틀리게친다(500);

    await waitFor(() => {
      expect(screen.queryByText(/아이디 또는 비밀번호/)).toBeNull();
    });
  });

  it('누르는 동안 다시 못 누른다', async () => {
    vi.spyOn(api, 'login').mockImplementation(() => new Promise(() => undefined));
    그리기();

    fireEvent.submit(screen.getByRole('button', { name: '로그인' }));

    const 버튼 = await screen.findByRole('button', { name: '확인하는 중' });
    expect(버튼.hasAttribute('disabled')).toBe(true);
  });
});
