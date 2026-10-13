// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type SettingsServiceRow } from './api.js';
import { ServicePanel } from './SettingsService.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 서비스: SettingsServiceRow = {
  id: 1,
  prefix: 'ZSA',
  name: '역할 계정 서비스',
  color: '#3A5FCD',
  envs: [
    {
      env: 'qa',
      baseUrl: 'https://qa.example.com',
      loginId: 'member',
      hasLoginPassword: true,
      isProd: false,
      accounts: [{ role: '관리자', loginId: 'admin', hasLoginPassword: true }],
    },
  ],
  hasSlackWebhook: false,
  testsRepo: '',
  testsDir: 'zsa',
  isActive: true,
  caseCount: 0,
};

/** 저장을 누르고 보낸 첫 대상 서버 줄 */
async function 저장한본문() {
  const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
  return 고침.mock.calls[0]?.[1]?.envs?.[0];
}

describe('대상 서버 줄의 역할 계정 · 운영 서버 (도메인/인증 §8.8 · 작성 §3.6 「★ 역할별 계정」)', () => {
  it('첫 계정 라벨이 「일반 회원」이고 받은 역할은 아이디만 되돌려 보낸다 — 비밀번호는 서버가 이름으로 이어받는다', async () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    expect(screen.getByText('일반 회원')).toBeTruthy();
    expect((screen.getByLabelText('대상 서버 1 역할 1 이름') as HTMLInputElement).value).toBe('관리자');

    expect(await 저장한본문()).toEqual({
      env: 'qa',
      baseUrl: 'https://qa.example.com',
      loginId: 'member',
      isProd: false,
      accounts: [{ role: '관리자', loginId: 'admin' }],
    });
  });

  it('역할 추가로 넣은 역할 · 아이디 · 비밀번호가 저장 본문 accounts 에 실린다', async () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 역할 추가' }));
    fireEvent.change(screen.getByLabelText('대상 서버 1 역할 2 이름'), { target: { value: '판매자' } });
    fireEvent.change(screen.getByLabelText('대상 서버 1 역할 2 아이디'), { target: { value: 'seller' } });
    fireEvent.change(screen.getByLabelText('대상 서버 1 역할 2 비밀번호'), { target: { value: 'pw-판매자' } });

    expect((await 저장한본문())?.accounts).toEqual([
      { role: '관리자', loginId: 'admin' },
      { role: '판매자', loginId: 'seller', loginPassword: 'pw-판매자' },
    ]);
  });

  it('새 역할의 빈 칸은 null 로 보낸다 — 같은 이름의 옛 역할 비밀번호가 되살아나지 않게', async () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 역할 1 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 역할 추가' }));
    fireEvent.change(screen.getByLabelText('대상 서버 1 역할 1 이름'), { target: { value: '관리자' } });

    expect((await 저장한본문())?.accounts).toEqual([{ role: '관리자', loginId: null, loginPassword: null }]);
  });

  it('삭제를 누르면 그 역할이 목록에서 빠진 채 간다', async () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 역할 1 삭제' }));

    expect((await 저장한본문())?.accounts).toEqual([]);
  });

  it('역할 비밀번호를 변경하거나 삭제하면 그것만 보낸다', async () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    expect(screen.getAllByText('비밀번호 설정됨')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 역할 1 비밀번호 삭제' }));

    expect((await 저장한본문())?.accounts).toEqual([{ role: '관리자', loginId: 'admin', loginPassword: null }]);
  });

  it('「운영 서버」를 체크하고 저장하면 isProd: true 를 보낸다', async () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(screen.getByLabelText('대상 서버 1 운영 서버'));

    expect(await 저장한본문()).toMatchObject({ isProd: true });
  });

  it('새 줄 이름이 prod 면 「운영 서버」가 미리 켜지고 그대로 보낸다 — 끌 수 있다', async () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '+ 대상 서버 추가' }));
    fireEvent.change(screen.getByLabelText('대상 서버 2 키'), { target: { value: 'prod' } });
    fireEvent.change(screen.getByLabelText('대상 서버 2 주소'), { target: { value: 'https://prod.example.com' } });
    expect((screen.getByLabelText('대상 서버 2 운영 서버') as HTMLInputElement).checked).toBe(true);

    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]?.envs?.[1]).toMatchObject({ env: 'prod', isProd: true });
  });

  it('역할 비밀번호 칸은 가린 입력이고 자동완성을 받지 않는다', () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 역할 1 비밀번호 변경' }));
    const 칸 = screen.getByLabelText('대상 서버 1 역할 1 비밀번호');
    expect(칸.getAttribute('type')).toBe('password');
    expect(칸.getAttribute('autocomplete')).toBe('new-password');
    expect(screen.getByLabelText('대상 서버 1 역할 1 아이디').getAttribute('autocomplete')).toBe('off');
  });

  it('비밀번호가 있던 역할의 이름을 바꾸면 초기화된다고 알리고 빈 비밀번호를 null 로 보낸다', async () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.change(screen.getByLabelText('대상 서버 1 역할 1 이름'), { target: { value: '운영자' } });
    expect(screen.getByText(/이 역할의 비밀번호가 초기화됩니다/)).toBeTruthy();

    expect((await 저장한본문())?.accounts).toEqual([{ role: '운영자', loginId: 'admin', loginPassword: null }]);
  });

  it.each([
    ['일반 회원', '「일반 회원」은 역할 이름으로 쓸 수 없습니다'],
    ['', '역할 이름을 입력해 주세요'],
    ['관리자', '한 대상 서버 줄 안에서 역할 이름이 겹칩니다'],
  ])('새 역할 이름이 「%s」면 저장 버튼 아래에 이유를 말하고 보내지 않는다', (이름, 이유) => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 역할 추가' }));
    fireEvent.change(screen.getByLabelText('대상 서버 1 역할 2 이름'), { target: { value: 이름 } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(document.querySelector('.set-why')?.textContent).toContain(이유);
    expect(고침).not.toHaveBeenCalled();
  });

  it('안내 문구가 실행 · 테스트 작성과 운영 서버 체크를 말한다', () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    expect(screen.getByText(/테스트 계정은 실행과 테스트 작성에서 로그인할 때 사용합니다/)).toBeTruthy();
  });
});
