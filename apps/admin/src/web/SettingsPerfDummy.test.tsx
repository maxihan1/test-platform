// @vitest-environment jsdom
// 설정 › 성능 에이전트 › 더미 클라이언트 구획 검사 (도메인/성능 §8.14)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ApiError } from './api.js';
import { perfApi, type 더미클라이언트 } from './perfApi.js';
import { SettingsPerfDummy } from './SettingsPerfDummy.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 앱들 = [
  { id: 7, prefix: 'ZPD', name: 'ZPD 게임' },
  { id: 8, prefix: 'ZPE', name: 'ZPE 웹' },
];
const 봇: 더미클라이언트 = { id: 5, name: '게임 봇', command: './bot', bytes: 3_145_728, createdAt: '2026-10-22T00:00:00.000Z' };

function 그리기(관리자 = true, 더미: 더미클라이언트[] = [봇]) {
  const 목록 = vi.spyOn(perfApi, 'dummyClients').mockResolvedValue({ clients: 더미 });
  render(<SettingsPerfDummy services={앱들} 기본접두사="ZPE" 관리자={관리자} />);
  return 목록;
}

async function 채우고올리기(파일: File) {
  fireEvent.change(await screen.findByLabelText('더미 클라이언트 이름'), { target: { value: '봇 2' } });
  fireEvent.change(screen.getByLabelText('실행 명령'), { target: { value: './bot2' } });
  fireEvent.change(screen.getByLabelText('zip 파일'), { target: { files: [파일] } });
  fireEvent.click(screen.getByRole('button', { name: '올리기' }));
}

describe('설정 › 더미 클라이언트', () => {
  it('고른 애플리케이션의 목록을 이름 · 명령 · 크기로 보인다', async () => {
    const 목록 = 그리기();
    const 줄 = (await screen.findByText('게임 봇')).closest('tr')!;
    expect(줄.textContent).toContain('./bot');
    expect(줄.textContent).toContain('3.0 MB');
    expect(목록).toHaveBeenCalledWith(8);
    fireEvent.change(screen.getByLabelText('애플리케이션'), { target: { value: '7' } });
    await waitFor(() => expect(목록).toHaveBeenCalledWith(7));
  });

  it('올리기는 zip 파일을 본문 그대로 보내고 목록을 다시 읽는다', async () => {
    const 목록 = 그리기();
    const 올리기 = vi.spyOn(perfApi, 'addDummyClient').mockResolvedValue({ id: 6 });
    const 파일 = new File(['PK'], 'bot.zip');
    await 채우고올리기(파일);
    await waitFor(() => expect(올리기).toHaveBeenCalledWith(8, '봇 2', './bot2', 파일));
    await waitFor(() => expect(목록).toHaveBeenCalledTimes(2));
  });

  it('이름이나 파일이 비면 보내지 않고 알린다', async () => {
    그리기();
    const 올리기 = vi.spyOn(perfApi, 'addDummyClient').mockResolvedValue({ id: 6 });
    fireEvent.click(await screen.findByRole('button', { name: '올리기' }));
    expect((await screen.findByRole('alert')).textContent).toBe('이름과 실행 명령을 적어 주세요');
    expect(올리기).not.toHaveBeenCalled();
  });

  it('200MB 를 넘으면 413 을 문구로 풀어 보인다', async () => {
    그리기();
    vi.spyOn(perfApi, 'addDummyClient').mockRejectedValue(new ApiError(413, '413', '', []));
    await 채우고올리기(new File(['PK'], 'bot.zip'));
    expect((await screen.findByRole('alert')).textContent).toBe('파일은 200MB 까지입니다');
  });

  it('쓰는 시나리오가 있으면 지우지 못한다는 문구를 보인다', async () => {
    그리기();
    vi.spyOn(perfApi, 'removeDummyClient').mockRejectedValue(new ApiError(409, 'IN_USE', '', []));
    fireEvent.click(await screen.findByRole('button', { name: '게임 봇 삭제' }));
    expect((await screen.findByRole('alert')).textContent).toBe('이 더미 클라이언트를 쓰는 시나리오가 있어 지우지 못합니다');
  });

  it('지우기는 그 번호로 부르고 목록을 다시 읽는다', async () => {
    const 목록 = 그리기();
    const 지우기 = vi.spyOn(perfApi, 'removeDummyClient').mockResolvedValue(undefined);
    fireEvent.click(await screen.findByRole('button', { name: '게임 봇 삭제' }));
    await waitFor(() => expect(지우기).toHaveBeenCalledWith(5));
    await waitFor(() => expect(목록).toHaveBeenCalledTimes(2));
  });

  it('admin 이 아니면 올리기 · 삭제 단추가 없다', async () => {
    그리기(false);
    await screen.findByText('게임 봇');
    expect(screen.queryByRole('button', { name: '올리기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '게임 봇 삭제' })).toBeNull();
  });
});
