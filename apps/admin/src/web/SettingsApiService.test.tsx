// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type SettingsServiceRow } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { ServicePanel } from './SettingsService.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
});

const API앱: SettingsServiceRow = {
  id: 7,
  prefix: 'ZAK',
  name: '알림 API',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  kind: 'API',
  apiDocPath: '/openapi.json',
  apiDocEnv: 'qa',
  envs: [
    {
      env: 'qa',
      baseUrl: 'https://qa.example.com',
      apiAuths: [{ name: '고객사 A', tokenUrl: '/oauth/token', clientId: 'client-a', clientSecretLast4: 'abcd' }],
    },
  ],
  hasSlackWebhook: false,
  testsRepo: '',
  testsDir: 'zak',
  isActive: true,
  caseCount: 0,
};

const 화면앱: SettingsServiceRow = {
  id: 8,
  prefix: 'ZAS',
  name: '쇼핑몰',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  testsRepo: '',
  testsDir: 'zas',
  isActive: true,
  caseCount: 0,
};

const 구획제목들 = () => [...document.querySelectorAll('.set-card h3')].map((el) => el.textContent);

async function 고친본문() {
  const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
  return 고침.mock.calls[0]?.[1];
}

function 인증을채운다(순번: number, 값: { 이름: string; 주소: string; 아이디: string; 비밀값?: string }) {
  const 칸 = (이름: string) => screen.getByLabelText(`대상 서버 1 API 인증 ${String(순번)} ${이름}`);
  fireEvent.change(칸('이름'), { target: { value: 값.이름 } });
  fireEvent.change(칸('토큰 주소'), { target: { value: 값.주소 } });
  fireEvent.change(칸('클라이언트 ID'), { target: { value: 값.아이디 } });
  if (값.비밀값 !== undefined) fireEvent.change(칸('비밀값'), { target: { value: 값.비밀값 } });
}

describe('API 애플리케이션 설정 (도메인/인증 §8.8 「종류」 · 도메인/API §3.8 · API-F1-08)', () => {
  it('고칠 때는 종류를 바꿀 수 없고 kind 를 안 보낸다 — 손대지 않은 비밀값은 빼서 서버가 이어받게 한다', async () => {
    render(<ServicePanel row={API앱} onDone={() => {}} />);

    expect(screen.queryByRole('group', { name: '종류' })).toBeNull();
    expect(screen.getByText('만든 뒤에는 바꿀 수 없습니다')).toBeTruthy();
    expect(구획제목들()).toContain('API 문서');
    expect((screen.getByLabelText('대상 서버 1 API 인증 1 비밀값') as HTMLInputElement).placeholder).toBe('•••• abcd');

    const 본문 = await 고친본문();
    expect(본문).not.toHaveProperty('kind');
    expect(본문).toMatchObject({ apiDocPath: '/openapi.json', apiDocEnv: 'qa' });
    expect(본문?.envs?.[0]?.apiAuths).toEqual([{ name: '고객사 A', tokenUrl: '/oauth/token', clientId: 'client-a' }]);
  });

  it('문서 경로와 기준 서버를 비우면 null 로 보낸다', async () => {
    render(<ServicePanel row={API앱} onDone={() => {}} />);
    fireEvent.change(screen.getByLabelText('문서 경로'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('기준 서버'), { target: { value: '' } });

    expect(await 고친본문()).toMatchObject({ apiDocPath: null, apiDocEnv: null });
  });

  it('화면 애플리케이션에는 API 문서 · API 인증 칸이 없고 API 칸을 하나도 보내지 않는다', async () => {
    render(<ServicePanel row={화면앱} onDone={() => {}} />);

    expect(구획제목들()).not.toContain('API 문서');
    expect(screen.queryByText('API 인증')).toBeNull();
    expect(screen.getByText('웹')).toBeTruthy();

    const 본문 = await 고친본문();
    for (const 키 of ['kind', 'apiDocPath', 'apiDocEnv']) expect(본문).not.toHaveProperty(키);
    expect(본문?.envs?.[0]).not.toHaveProperty('apiAuths');
  });

  it('비밀값 없이 새로 더한 인증은 칸 아래에 알리고 저장을 막는다', () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={API앱} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 API 인증 추가' }));
    인증을채운다(2, { 이름: '고객사 B', 주소: '/oauth/token', 아이디: 'client-b' });

    expect(screen.getByText('비밀값을 입력해 주세요. 새 인증이거나 이름 · 토큰 주소 · 서버 주소를 바꾸면 다시 넣어야 합니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(고침).not.toHaveBeenCalled();
    expect(document.querySelector('.set-why')?.textContent).toBe('API 인증 비밀값을 입력해 주세요');
  });

  it('저장된 인증의 이름이나 토큰 주소를 바꾸면 옛 비밀값을 못 이어받아 비밀값을 다시 받는다', () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={API앱} onDone={() => {}} />);
    fireEvent.change(screen.getByLabelText('대상 서버 1 API 인증 1 토큰 주소'), { target: { value: 'https://auth.example.com/token' } });

    expect((screen.getByLabelText('대상 서버 1 API 인증 1 비밀값') as HTMLInputElement).placeholder).toBe('비밀값');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(고침).not.toHaveBeenCalled();
  });

  it('대상 서버 주소를 바꾸면 / 로 시작하는 토큰 주소의 인증은 비밀값을 다시 받고, http(s) 토큰 주소는 그대로 잇는다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={API앱} onDone={() => {}} />);
    fireEvent.change(screen.getByLabelText('대상 서버 1 주소'), { target: { value: 'https://other.example.com' } });

    expect(screen.getByText('비밀값을 입력해 주세요. 새 인증이거나 이름 · 토큰 주소 · 서버 주소를 바꾸면 다시 넣어야 합니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(고침).not.toHaveBeenCalled();
    expect(document.querySelector('.set-why')?.textContent).toBe('API 인증 비밀값을 입력해 주세요');
    cleanup();

    const 절대주소 = { name: '고객사 A', tokenUrl: 'https://auth.example.com/token', clientId: 'client-a', clientSecretLast4: 'abcd' };
    render(<ServicePanel row={{ ...API앱, envs: [{ env: 'qa', baseUrl: 'https://qa.example.com', apiAuths: [절대주소] }] }} onDone={() => {}} />);
    fireEvent.change(screen.getByLabelText('대상 서버 1 주소'), { target: { value: 'https://other.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
  });

  it('「삭제」를 누르면 그 인증이 빠진 목록을 보낸다', async () => {
    render(<ServicePanel row={API앱} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 API 인증 1 삭제' }));

    expect((await 고친본문())?.envs?.[0]?.apiAuths).toEqual([]);
  });
});
