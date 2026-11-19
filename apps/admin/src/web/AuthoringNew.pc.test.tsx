// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthoringNew } from './AuthoringNew.js';

const 만든본문: unknown[] = [];

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      createAuthoringRequest: (_service: string, body: unknown) => {
        만든본문.push(body);
        return Promise.resolve({ id: 7 });
      },
      uploadAuthoringAsset: () => Promise.resolve({ id: 1 }),
      submitAuthoringRequest: () => Promise.resolve({ ok: true }),
      discardAuthoring: () => Promise.resolve({}),
    },
  };
});

vi.mock('./guideApi.js', () => ({
  guideApi: {
    now: () => Promise.resolve({ version: 2, intro: 'Boss Room PC', policy: '', rules: '', files: [], savedAt: null, savedByName: null }),
  },
}));

beforeEach(() => {
  만든본문.length = 0;
});

afterEach(() => {
  cleanup();
});

const 다음 = () => fireEvent.click(screen.getByRole('button', { name: '다음' }));
const 시작단추 = () => screen.getByRole('button', { name: '테스트 작성 시작' }) as HTMLButtonElement;
const 패드 = (이름: string) => screen.getByRole('checkbox', { name: 이름 }) as HTMLInputElement;

/** 첫 단계 → 기획서로 → 자료(파일 하나) → 확인 */
function 확인까지() {
  다음();
  fireEvent.click(screen.getByRole('button', { name: 'PRD 기준' }));
  다음();
  fireEvent.change(screen.getByLabelText('PRD'), { target: { files: [new File(['x'], '기획서.pdf')] } });
  다음();
}

describe('새 작성 — PC 게임 지원 패드 (도메인/게임 §3.10 「윈도우 PC」 「지원 패드」)', () => {
  it('앞 작성에서 남긴 체크로 열고, 바꾼 체크를 PS5 · PS4 · Switch · Xbox 차례로 보낸다', async () => {
    render(<AuthoringNew service="ARW" 앱종류="GAME" pc={{ 패드: ['xbox'], 빌드: 'a41c9e2' }} on넣었다={() => {}} />);
    await screen.findByText('지원 패드');
    expect(패드('Xbox').checked).toBe(true);
    expect(패드('PS5').checked).toBe(false);
    fireEvent.click(패드('PS5'));
    확인까지();
    expect(screen.getByText('PS5 · Xbox')).toBeTruthy();
    fireEvent.click(시작단추());

    await waitFor(() => expect(만든본문).toHaveLength(1));
    expect(만든본문[0]).toMatchObject({ kind: 'AUTHOR', gamePads: ['ps5', 'xbox'] });
  });

  it('체크를 다 풀어도 빈 목록을 보낸다 — 서버가 애플리케이션의 지원 패드를 비운다', async () => {
    render(<AuthoringNew service="ARW" 앱종류="GAME" pc={{ 패드: ['ps5'], 빌드: 'a41c9e2' }} on넣었다={() => {}} />);
    await screen.findByText('지원 패드');
    fireEvent.click(패드('PS5'));
    확인까지();
    expect(screen.getByText('없음 — 키보드만')).toBeTruthy();
    fireEvent.click(시작단추());

    await waitFor(() => expect(만든본문).toHaveLength(1));
    expect(만든본문[0]).toMatchObject({ gamePads: [] });
  });

  it('Windows 빌드가 없으면 첫 단계에 까닭을 보이고 확인 단계에서 시작을 잠근다', async () => {
    render(<AuthoringNew service="ARW" 앱종류="GAME" pc={{ 패드: [], 빌드: null }} on넣었다={() => {}} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Windows 빌드가 없어 작성을 시작할 수 없습니다');
    확인까지();
    expect(시작단추().disabled).toBe(true);
  });

  it('모바일 게임에는 패드 칸이 없고 gamePads 를 보내지 않는다 — 서버가 400 NOT_PC_GAME 을 낸다', async () => {
    render(<AuthoringNew service="ARG" 앱종류="GAME" on넣었다={() => {}} />);
    await screen.findByText('Boss Room PC');
    expect(screen.queryByText('지원 패드')).toBeNull();
    확인까지();
    fireEvent.click(시작단추());

    await waitFor(() => expect(만든본문).toHaveLength(1));
    expect(만든본문[0]).not.toHaveProperty('gamePads');
  });
});
