// @vitest-environment jsdom
// 실행 창 — 값을 고친 채 닫을 때 한 번 묻기 · 서비스마다 마지막 대상 서버 미리 고르기 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api } from './api.js';
import { 고른서버를적는다, 마지막서버 } from './layout.js';
import { RunPickModal } from './RunPickModal.js';
import { 사람, 서비스, 저장값케이스 } from './runPick.fixture.js';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function 연다(덮어쓸: { 초기서버?: string } = {}) {
  const onClose = vi.fn();
  render(<RunPickModal 케이스들={[저장값케이스]} service={서비스} user={사람} onRun={vi.fn()} onClose={onClose} {...덮어쓸} />);
  await act(async () => {});
  return onClose;
}

const Esc = () => fireEvent.keyDown(document, { key: 'Escape' });
const 서버칸 = () => screen.getByLabelText('대상 서버') as HTMLSelectElement;

describe('실행 창 — 고친 채 닫기', () => {
  it('값을 안 고쳤으면 Esc 한 번에 닫힌다', async () => {
    const onClose = await 연다();
    Esc();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('값을 고쳤으면 Esc 에 버튼 줄이 묻고, 그때 Esc 는 계속 고치기 · 닫기를 눌러야 닫힌다', async () => {
    const onClose = await 연다();
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'user2' } });

    Esc();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('고친 값이 사라집니다')).toBeTruthy();
    Esc();
    expect(screen.queryByText('고친 값이 사라집니다')).toBeNull();
    expect((screen.getByLabelText('아이디') as HTMLInputElement).value).toBe('user2');

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('실행 창 — 마지막 대상 서버', () => {
  it('처음이면 고르지 않은 채로 열고, 고르면 그 서비스에 적어 다음 창이 그 서버로 열린다', async () => {
    await 연다();
    expect(서버칸().value).toBe('');
    fireEvent.change(서버칸(), { target: { value: 'stage' } });
    expect(마지막서버('ZRS', 서비스.envs)).toBe('stage');

    cleanup();
    await 연다();
    expect(서버칸().value).toBe('stage');
  });

  it('다른 서비스에서 고른 서버는 이 서비스에 안 넘어온다', async () => {
    고른서버를적는다('ZZZ', 'qa');
    await 연다();
    expect(서버칸().value).toBe('');
  });

  it('적어 둔 서버가 서비스에서 지워졌으면 고르지 않은 채로 연다', async () => {
    고른서버를적는다('ZRS', 'prod');
    await 연다();
    expect(서버칸().value).toBe('');
  });

  it('여는 쪽이 준 서버(실패 다시 실행)가 마지막 서버를 이긴다', async () => {
    고른서버를적는다('ZRS', 'stage');
    await 연다({ 초기서버: 'qa' });
    expect(서버칸().value).toBe('qa');
  });
});
