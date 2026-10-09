// @vitest-environment jsdom
// 목록 밖에서 tcId 로 여는 실행 창 — 케이스 읽기 · 지난값 채우기 · 비활성 거르기 · 걸기 (도메인/실행 §8.10)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type CaseRow } from './api.js';
import { 사람 } from './runPick.fixture.js';
import { RunWindow } from './RunWindow.js';

beforeEach(() => {
  window.location.hash = '#/cases';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 입력스키마 = {
  type: 'object',
  properties: {
    userId: { type: 'string', description: '아이디', default: 'guest' },
    password: { type: 'string', description: '비밀번호' },
  },
  required: ['password'],
};

function 케이스(tcId: string, 덮어쓸: Partial<CaseRow> = {}): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: 입력스키마,
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-09-21T00:00:00.000Z',
    ...덮어쓸,
  };
}

function 읽기모킹(케이스들: CaseRow[]) {
  vi.spyOn(api, 'caseOf').mockImplementation((tcId) => {
    const 찾은 = 케이스들.find((c) => c.tcId === tcId);
    return 찾은 === undefined ? Promise.reject(new Error('케이스가 없습니다')) : Promise.resolve(찾은);
  });
  vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
}

const 서버고르기 = () => fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
const 실행버튼 = () => screen.getByRole('button', { name: '실행' });

describe('RunWindow', () => {
  it('tcIds 로 케이스와 나를 읽어 창을 띄운다', async () => {
    읽기모킹([케이스('ZRS-001'), 케이스('ZRS-002')]);
    render(<RunWindow tcIds={['ZRS-001', 'ZRS-002']} onClose={vi.fn()} />);

    expect(screen.getByText('불러오는 중입니다.')).toBeTruthy();
    expect(await screen.findByRole('dialog', { name: '실행할 케이스 2건' })).toBeTruthy();
    expect(screen.getByText('ZRS-001 케이스')).toBeTruthy();
    expect(screen.getByText('ZRS-002 케이스')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'qa' })).toBeTruthy();
  });

  it('읽기가 실패하면 사유와 닫기만 있는 창이 뜬다', async () => {
    vi.spyOn(api, 'caseOf').mockRejectedValue(new Error('케이스를 읽지 못했습니다'));
    vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
    const onClose = vi.fn();
    render(<RunWindow tcIds={['ZRS-001']} onClose={onClose} />);

    expect(await screen.findByText('케이스를 읽지 못했습니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('지난 값으로 칸을 채우되 비밀값 칸은 비워 둔다', async () => {
    읽기모킹([케이스('ZRS-001')]);
    render(
      <RunWindow
        tcIds={['ZRS-001']}
        지난값={{ 'ZRS-001': { params: { userId: 'u9', password: '********' }, expected: {} } }}
        onClose={vi.fn()}
      />,
    );

    expect(((await screen.findByLabelText('아이디')) as HTMLInputElement).value).toBe('u9');
    expect((screen.getByLabelText('비밀번호') as HTMLInputElement).value).toBe('');
  });

  it('서버를 넘기면 그 서버가 골라진 채로 열린다', async () => {
    읽기모킹([케이스('ZRS-001')]);
    render(<RunWindow tcIds={['ZRS-001']} 서버="stage" onClose={vi.fn()} />);

    await screen.findByRole('dialog');
    expect((screen.getByLabelText('대상 서버') as HTMLSelectElement).value).toBe('stage');
  });

  it('비활성 케이스는 빼고 창 안에 그 사실을 적는다', async () => {
    읽기모킹([케이스('ZRS-001'), 케이스('ZRS-002', { isActive: false })]);
    render(<RunWindow tcIds={['ZRS-001', 'ZRS-002']} onClose={vi.fn()} />);

    expect(await screen.findByRole('dialog', { name: '실행할 케이스 1건' })).toBeTruthy();
    expect(screen.getByText('비활성이라 뺀 케이스 ZRS-002')).toBeTruthy();
    expect(screen.queryByText('ZRS-002 케이스')).toBeNull();
  });

  it('고른 것이 전부 비활성이면 돌릴 것이 없다는 말만 있는 창이 뜬다', async () => {
    읽기모킹([케이스('ZRS-001', { isActive: false })]);
    render(<RunWindow tcIds={['ZRS-001']} onClose={vi.fn()} />);

    expect(await screen.findByText('실행할 케이스가 없습니다. 고른 것이 전부 비활성이거나 걸러졌습니다')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '실행' })).toBeNull();
  });

  it('걸면 createRun 을 부르고 그 실행 결과로 옮겨 가며 창을 닫는다', async () => {
    읽기모킹([케이스('ZRS-001')]);
    const 만들기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 42 });
    const onClose = vi.fn();
    render(<RunWindow tcIds={['ZRS-001']} onClose={onClose} />);
    await screen.findByRole('dialog');

    서버고르기();
    fireEvent.click(실행버튼());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(window.location.hash).toBe('#/runs/42');
    expect(만들기).toHaveBeenCalledTimes(1);
    expect(만들기.mock.calls[0]?.[0]).toMatchObject({ env: 'qa', title: 'ZRS-001 실행', items: [{ tcId: 'ZRS-001', platforms: ['desktop'] }] });
  });

  it('서버가 거절하면 사유가 창에 남고 창은 닫히지 않으며 다시 누를 수 있다', async () => {
    읽기모킹([케이스('ZRS-001')]);
    vi.spyOn(api, 'createRun').mockRejectedValueOnce(new Error('그 케이스를 찾지 못했습니다')).mockResolvedValue({ runId: 9 });
    const onClose = vi.fn();
    render(<RunWindow tcIds={['ZRS-001']} onClose={onClose} />);
    await screen.findByRole('dialog');

    서버고르기();
    fireEvent.click(실행버튼());

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('그 케이스를 찾지 못했습니다'));
    expect(onClose).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#/cases');
    expect((실행버튼() as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(실행버튼());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(window.location.hash).toBe('#/runs/9');
  });

  it('값을 고치면 아까 거절당한 사유가 걷힌다', async () => {
    읽기모킹([케이스('ZRS-001')]);
    vi.spyOn(api, 'createRun').mockRejectedValue(new Error('그 케이스를 찾지 못했습니다'));
    render(<RunWindow tcIds={['ZRS-001']} onClose={vi.fn()} />);
    await screen.findByRole('dialog');
    서버고르기();
    fireEvent.click(실행버튼());
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('그 케이스를 찾지 못했습니다'));

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'u2' } });

    expect(screen.getByRole('status').textContent).toBe('실행 항목이 1건 생깁니다');
  });

  it('그 서비스의 실행 칸이 쓰기가 아니면 실행 버튼 없이 사유만 보인다 — 옛 주소는 아무나 칠 수 있다', async () => {
    읽기모킹([케이스('ZRS-001')]);
    vi.spyOn(api, 'me').mockResolvedValue({ user: { ...사람, services: [{ ...사람.services[0]!, permissions: { cases: 'read', runs: 'read', authoring: 'none' } }] } });
    render(<RunWindow tcIds={['ZRS-001']} onClose={vi.fn()} />);

    expect(await screen.findByText('실행 권한이 있어야 고치고 돌릴 수 있습니다')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '실행' })).toBeNull();
    expect(screen.queryByRole('button', { name: '▶ 테스트 실행' })).toBeNull();
  });

  it('걸린 뒤에는 on걸림 을 부르고 onClose 는 안 부른다 — 옛 주소에서 닫힘이 실행 결과 대신 목록으로 보냈다', async () => {
    읽기모킹([케이스('ZRS-001')]);
    vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 43 });
    const onClose = vi.fn();
    const on걸림 = vi.fn();
    render(<RunWindow tcIds={['ZRS-001']} onClose={onClose} on걸림={on걸림} />);
    await screen.findByRole('dialog');

    서버고르기();
    fireEvent.click(실행버튼());

    await waitFor(() => expect(on걸림).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#/runs/43');
  });
});
