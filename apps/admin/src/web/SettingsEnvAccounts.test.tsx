// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type SettingsServiceRow } from './api.js';
import { prdApi, type PrdNow } from './prdApi.js';
import { ServicePanel } from './SettingsService.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 서비스: SettingsServiceRow = {
  id: 1,
  prefix: 'ZSA',
  name: '역할 계정 애플리케이션',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
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

describe('대상 서버 줄의 역할 계정 · 실서비스 서버 (도메인/인증 §8.8 · 작성 §3.6 「★ 역할별 계정」)', () => {
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

  it('「실서비스 서버」를 체크하고 저장하면 isProd: true 를 보낸다', async () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(screen.getByLabelText('대상 서버 1 실서비스 서버'));

    expect(await 저장한본문()).toMatchObject({ isProd: true });
  });

  it('새 줄 이름이 prod 면 「실서비스 서버」가 미리 켜지고 그대로 보낸다 — 끌 수 있다', async () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '+ 대상 서버 추가' }));
    fireEvent.change(screen.getByLabelText('대상 서버 2 키'), { target: { value: 'prod' } });
    fireEvent.change(screen.getByLabelText('대상 서버 2 주소'), { target: { value: 'https://prod.example.com' } });
    expect((screen.getByLabelText('대상 서버 2 실서비스 서버') as HTMLInputElement).checked).toBe(true);

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

  it('안내 문구가 실행 · 테스트 작성과 실서비스 서버 체크를 말한다', () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    expect(screen.getByText(/테스트 계정은 실행과 테스트 작성에서 로그인할 때 사용합니다/)).toBeTruthy();
  });
});

describe('역할 이름 제안 (점검 14.2)', () => {
  const 받음 = (roles: { role: string; registered: boolean }[]) =>
    vi.spyOn(prdApi, 'now').mockResolvedValue({ held: { reqs: {}, roles: roles.map((r) => ({ ...r, count: 1 })), continueFrom: null } } as unknown as PrdNow);
  const 제안들 = () => [...document.querySelectorAll('datalist option')].map((o) => o.getAttribute('value'));

  it('그 애플리케이션의 PRD 역할을 제안하고 안내 한 줄에는 계정이 아직 없는 역할만 적는다', async () => {
    const 읽음 = 받음([
      { role: '판매자', registered: true },
      { role: '관리자', registered: false },
    ]);
    render(<ServicePanel row={서비스} onDone={() => {}} />);

    expect(await screen.findByText('PRD 가 기다리는 역할: 관리자')).toBeTruthy();
    expect(읽음).toHaveBeenCalledWith('ZSA');
    expect(제안들()).toEqual(['관리자', '판매자']);
    const 칸 = screen.getByLabelText('대상 서버 1 역할 1 이름');
    expect(document.getElementById(칸.getAttribute('list') ?? '')?.tagName).toBe('DATALIST');
  });

  it('같은 애플리케이션의 다른 대상 서버 줄에 이미 쓴 역할 이름도 제안한다', async () => {
    받음([]);
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '+ 대상 서버 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 2 역할 추가' }));

    const 둘째줄 = screen.getByLabelText('대상 서버 2 역할 1 이름');
    const 목록 = document.getElementById(둘째줄.getAttribute('list') ?? '');
    expect([...(목록?.querySelectorAll('option') ?? [])].map((o) => o.getAttribute('value'))).toEqual(['관리자']);
    expect(screen.queryByText(/PRD 가 기다리는 역할/)).toBeNull();
  });

  it('줄마다 제안 목록 id 가 다르다', async () => {
    받음([{ role: '관리자', registered: false }]);
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '+ 대상 서버 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 2 역할 추가' }));

    const 아이디들 = [...document.querySelectorAll('datalist')].map((d) => d.id);
    expect(new Set(아이디들).size).toBe(아이디들.length);
  });

  it('읽기에 실패하면 제안 없이 조용히 넘어간다 — 오류를 띄우지 않고 직접 쳐서 넣을 수 있다', async () => {
    const 읽음 = vi.spyOn(prdApi, 'now').mockRejectedValue(new Error('PRD 없음'));
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    await waitFor(() => expect(읽음).toHaveBeenCalled());

    expect(screen.queryByText(/PRD 가 기다리는 역할/)).toBeNull();
    expect(screen.queryByText('PRD 없음')).toBeNull();
    expect(제안들()).toEqual([]);
    fireEvent.change(screen.getByLabelText('대상 서버 1 역할 1 이름'), { target: { value: '손님' } });
    expect((screen.getByLabelText('대상 서버 1 역할 1 이름') as HTMLInputElement).value).toBe('손님');
  });

});
