// @vitest-environment jsdom
// 설정 마법사 검사 — 종류마다 다른 칸 · 확인 표 · 끝 화면 (도메인/인증 §8.8 「새로 만들기 마법사」). SettingsWizard.test.tsx 가 300줄에 닿지 않게 뗐다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

import { api } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { 그린다, 다음, 단계들, 서버를더한다, 이름을채운다, 종류를고른다, 확인까지 } from './SettingsWizard.fixture.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
});

describe('종류마다 다른 칸', () => {
  it('API 를 고르면 API 문서 단계가 끼고 문서 경로 · 기준 서버 · 비밀값이 든 API 인증을 보낸다', async () => {
    const 만듦 = vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    그린다();
    다음();
    종류를고른다('API');
    expect(단계들()).toContain('5API 문서');
    다음();
    이름을채운다('NOTI', '알림');
    다음();
    서버를더한다('qa', 'https://qa.example.com');
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 API 인증 추가' }));
    const 칸 = (이름: string) => screen.getByLabelText(`대상 서버 1 API 인증 1 ${이름}`);
    fireEvent.change(칸('이름'), { target: { value: '고객사 A' } });
    fireEvent.change(칸('토큰 주소'), { target: { value: '/oauth/token' } });
    fireEvent.change(칸('클라이언트 ID'), { target: { value: 'client-a' } });
    fireEvent.change(칸('비밀값'), { target: { value: 'secret-123456789' } });
    다음();
    fireEvent.change(screen.getByLabelText('문서 경로'), { target: { value: '/openapi.json' } });
    fireEvent.change(screen.getByLabelText('기준 서버'), { target: { value: 'qa' } });
    다음();
    expect(screen.queryByLabelText('탐색 제외 경로')).toBeNull();
    다음();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    await waitFor(() => expect(만듦).toHaveBeenCalledTimes(1));
    const 본문 = 만듦.mock.calls[0]?.[0];
    expect(본문).toMatchObject({ kind: 'API', apiDocPath: '/openapi.json', apiDocEnv: 'qa' });
    expect(본문?.envs[0]?.apiAuths).toEqual([{ name: '고객사 A', tokenUrl: '/oauth/token', clientId: 'client-a', clientSecret: 'secret-123456789' }]);
  });

  it('게임을 고르면 대상 서버 줄에 어드민 키 칸이 서고 adminKey 를 보낸다', async () => {
    const 만듦 = vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    그린다();
    다음();
    종류를고른다('게임');
    다음();
    이름을채운다('ASH', 'Ashveil');
    다음();
    서버를더한다('qa', 'https://qa.ashveil.dev');
    fireEvent.change(screen.getByLabelText('대상 서버 1 어드민 키 머리 이름'), { target: { value: 'X-Admin-Key' } });
    fireEvent.change(screen.getByLabelText('대상 서버 1 어드민 키 값'), { target: { value: 'secret-admin-0001' } });
    다음();
    다음();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    await waitFor(() => expect(만듦).toHaveBeenCalledTimes(1));
    const 본문 = 만듦.mock.calls[0]?.[0];
    expect(본문?.kind).toBe('GAME');
    expect(본문?.envs[0]?.adminKey).toEqual({ header: 'X-Admin-Key', value: 'secret-admin-0001' });
    expect(본문?.envs[0]).not.toHaveProperty('apiAuths');
  });
});

describe('확인 표', () => {
  it('체크 상자를 안 건드린 prod 줄도 실서비스 서버로 보인다 — 보내는 값과 같게', () => {
    그린다();
    다음();
    종류를고른다('웹');
    다음();
    이름을채운다('PAY', '결제');
    다음();
    서버를더한다('prod', 'https://pay.example.com');
    다음();
    다음();

    expect(screen.getByText('실서비스 서버')).toBeTruthy();
  });

  it('만드는 동안 「고치기」를 누를 수 없다 — 그사이 고친 값은 이미 보낸 요청에 안 실린다', () => {
    vi.spyOn(api, 'createService').mockReturnValue(new Promise(() => {}));
    그린다();
    확인까지();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    expect((screen.getByRole('button', { name: '종류 고치기' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '종류' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('끝 화면', () => {
  async function 다만든다() {
    vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    확인까지();
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));
    await screen.findByText('결제 애플리케이션을 만들었습니다');
  }

  it('맨 위 고르개에 있으면 「테스트 작성 시작」 이 그 애플리케이션 번호를, 「설정 열기」 가 접두사를 넘긴다', async () => {
    const 끝 = 그린다();
    await 다만든다();

    fireEvent.click(screen.getByRole('button', { name: '테스트 작성 시작' }));
    expect(끝.on작성).toHaveBeenCalledWith(9);
    fireEvent.click(screen.getByRole('button', { name: '설정 열기' }));
    expect(끝.on설정).toHaveBeenCalledWith('PAY');
  });

  it('나에게 배정 안 된 프로젝트면 작성으로 바로 못 가서 배정하는 길을 말한다', async () => {
    그린다({ 고를수있나: () => false, 내프로젝트: () => false });
    await 다만든다();

    expect(screen.queryByRole('button', { name: '테스트 작성 시작' })).toBeNull();
    expect(screen.getByText('맨 위 고르개에서 고르려면 「계정」에서 이 프로젝트를 나에게 배정합니다')).toBeTruthy();
  });

  it('배정된 프로젝트인데 맨 위 재료를 아직 다시 읽는 중이면 배정 안내를 띄우지 않는다', async () => {
    그린다({ 고를수있나: () => false, 내프로젝트: () => true });
    await 다만든다();

    expect(screen.queryByRole('button', { name: '테스트 작성 시작' })).toBeNull();
    expect(screen.queryByText(/「계정」에서 이 프로젝트를 나에게 배정합니다/)).toBeNull();
  });
});
