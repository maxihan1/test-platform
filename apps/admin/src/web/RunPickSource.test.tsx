// @vitest-environment jsdom
// 실행 창 입력값 출처 줄 — 저장값 · 코드 기본값 · 「이번 실행에만 · 이 값 저장 · 되돌리기」 · 저장하고 닫기 (도메인/실행 §8.10). 결과가 남는 곳은 RunPickDest.test.tsx

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError, type CaseRow, type User } from './api.js';
import { RunPickModal } from './RunPickModal.js';
import { 사람, 서비스, 읽기만, 저장값케이스, 값케이스 } from './runPick.fixture.js';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function 연다(케이스들: CaseRow[], 덮어쓸: { user?: User; 초기글자?: Record<string, { params: Record<string, string>; expected: Record<string, string> }> } = {}) {
  const onClose = vi.fn();
  const onRun = vi.fn();
  const on다시읽기 = vi.fn();
  render(<RunPickModal 케이스들={케이스들} service={서비스} user={사람} onRun={onRun} onClose={onClose} on다시읽기={on다시읽기} {...덮어쓸} />);
  await act(async () => {});
  return { onClose, onRun, on다시읽기 };
}

const 아이디칸 = (tcId = 'ZRS-001') => document.getElementById(`p-${tcId}-userId`) as HTMLInputElement;
const 고친다 = (값: string, tcId = 'ZRS-001') => fireEvent.change(아이디칸(tcId), { target: { value: 값 } });
const Esc = () => fireEvent.keyDown(document, { key: 'Escape' });
const 단추 = (name: string) => screen.getByRole('button', { name });

describe('출처 줄', () => {
  it('저장값으로 열면 누가 언제 저장했는지, 저장값이 없으면 코드 기본값이라고 적는다', async () => {
    await 연다([값케이스]);
    expect(document.querySelector('.prow-src')?.textContent).toBe('코드 기본값');

    cleanup();
    await 연다([저장값케이스]);
    expect(document.querySelector('.prow-src')?.textContent).toMatch(/^저장값 · 맥시 ·/);
  });

  it('고치면 이번 실행에만 쓴다고 바뀌고 「이 값 저장」 · 「되돌리기」가 선다', async () => {
    await 연다([저장값케이스]);
    고친다('user2');

    expect(screen.getByText('저장값과 다릅니다 · 이번 실행에만 씁니다')).toBeTruthy();
    expect(단추('이 값 저장')).toBeTruthy();
    expect(단추('되돌리기')).toBeTruthy();
    expect(screen.getByText('팀 모두와 정기 실행에 쓰입니다')).toBeTruthy();
  });

  it('저장값이 없는 케이스는 코드 기본값과 다르다고 적는다', async () => {
    await 연다([값케이스]);
    고친다('user2');
    expect(screen.getByText('코드 기본값과 다릅니다 · 이번 실행에만 씁니다')).toBeTruthy();
  });

  it('「이 값 저장」은 보이는 값 그대로 저장값으로 저장하고 케이스를 다시 읽게 한다. 비워 둔 저장 비밀값은 안 보낸다', async () => {
    const { on다시읽기 } = await 연다([저장값케이스]);
    const 저장 = vi.spyOn(api, 'saveInput').mockResolvedValue(null);
    고친다('user2');

    fireEvent.click(단추('이 값 저장'));

    await waitFor(() => expect(on다시읽기).toHaveBeenCalledWith('ZRS-001'));
    expect(저장).toHaveBeenCalledWith('ZRS-001', { params: { userId: 'user2' }, expected: {} });
    expect(screen.getByText('저장값으로 저장했습니다.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '이 값 저장' })).toBeNull();
  });

  it('「되돌리기」는 저장값으로 칸을 돌리고 실행에 고친 값을 싣지 않는다', async () => {
    const { onRun } = await 연다([저장값케이스]);
    고친다('user2');

    fireEvent.click(단추('되돌리기'));

    expect(아이디칸().value).toBe('user1');
    expect(document.querySelector('.prow-src')?.textContent).toMatch(/^저장값 · 맥시 ·/);
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(단추('실행'));
    expect(onRun.mock.calls[0]?.[0].items[0]?.params ?? {}).toEqual({});
  });

  it('케이스 쓰기 권한이 없으면 「이 값 저장」은 없고 「되돌리기」는 있다', async () => {
    await 연다([저장값케이스], { user: 읽기만 });
    고친다('user2');
    expect(screen.queryByRole('button', { name: '이 값 저장' })).toBeNull();
    expect(단추('되돌리기')).toBeTruthy();
  });

  it('명세에 안 맞는 값은 저장하지 않고 칸 아래에 사유를 붙인다', async () => {
    const 케이스: CaseRow = {
      ...값케이스,
      paramSchema: { type: 'object', properties: { userId: { type: 'string', description: '아이디', default: 'guest', minLength: 3 } } },
    };
    await 연다([케이스]);
    const 저장 = vi.spyOn(api, 'saveInput');
    고친다('a');

    fireEvent.click(단추('이 값 저장'));

    expect(저장).not.toHaveBeenCalled();
    expect(screen.getByText('입력값이 명세와 맞지 않습니다.')).toBeTruthy();
  });

  it('여러 건 창도 케이스마다 줄이 있고 「이 값 저장」은 그 케이스만 저장한다', async () => {
    const 둘째: CaseRow = { ...값케이스, tcId: 'ZRS-002' };
    const { on다시읽기 } = await 연다([값케이스, 둘째]);
    const 저장 = vi.spyOn(api, 'saveInput').mockResolvedValue(null);
    고친다('user2', 'ZRS-002');

    expect(screen.getAllByRole('button', { name: '이 값 저장' })).toHaveLength(1);
    fireEvent.click(단추('이 값 저장'));

    await waitFor(() => expect(on다시읽기).toHaveBeenCalledWith('ZRS-002'));
    expect(저장).toHaveBeenCalledTimes(1);
    expect(저장).toHaveBeenCalledWith('ZRS-002', { params: { userId: 'user2' }, expected: {} });
  });
});

describe('저장한 뒤', () => {
  it('저장값을 지우면 「저장했습니다」에 머물지 않고 코드 기본값과 다르다고 적는다', async () => {
    await 연다([저장값케이스]);
    vi.spyOn(api, 'saveInput').mockResolvedValue(null);
    vi.spyOn(api, 'clearInput').mockResolvedValue(undefined);
    고친다('user2');
    fireEvent.click(단추('이 값 저장'));
    await screen.findByText('저장값으로 저장했습니다.');

    fireEvent.click(단추('저장값 지우기'));
    fireEvent.click(단추('지우기 확인'));

    await waitFor(() => expect(screen.queryByText('저장값으로 저장했습니다.')).toBeNull());
  });

  it('출처 줄에서 저장해 케이스를 다시 읽으면 「저장한 값」 목록도 저장값을 고른다', async () => {
    const 묶음 = { id: 7, tcId: 'ZRS-001', name: '회원', params: { userId: 'bundle' }, expected: {}, createdAt: '2026-09-29T05:02:00.000Z' };
    vi.mocked(api.paramSets).mockResolvedValue({ items: [묶음] });
    const 그림 = render(<RunPickModal 케이스들={[값케이스]} service={서비스} user={사람} onRun={vi.fn()} onClose={vi.fn()} />);
    await act(async () => {});
    const 목록 = () => screen.getByLabelText('저장한 값') as HTMLSelectElement;
    expect(목록().value).toBe('code');

    const 저장된: CaseRow = {
      ...값케이스,
      savedInput: { params: { userId: 'user2' }, expected: {}, savedSecrets: { params: [], expected: [] }, savedBy: '김실행', savedAt: '2026-10-30T01:00:00.000Z' },
    };
    그림.rerender(<RunPickModal 케이스들={[저장된]} service={서비스} user={사람} onRun={vi.fn()} onClose={vi.fn()} />);

    expect(목록().value).toBe('saved');
  });

  it('여러 건 창에서 서버가 칸 사유를 주면 저장한 그 케이스 칸에만 붙인다', async () => {
    const 둘째: CaseRow = { ...값케이스, tcId: 'ZRS-002' };
    await 연다([값케이스, 둘째]);
    vi.spyOn(api, 'saveInput').mockRejectedValue(
      new ApiError(400, 'INVALID_PARAMS', '아이디가 틀렸다', [{ path: 'userId', message: '아이디가 틀렸다' }]),
    );
    고친다('user2', 'ZRS-002');

    fireEvent.click(단추('이 값 저장'));

    expect(await screen.findAllByText('아이디가 틀렸다')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '값' })[1]?.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('저장 안 한 채 닫기', () => {
  it('고친 값을 저장하지 않고 닫으려 하면 「저장하고 닫기」까지 묻고, 누르면 저장한 뒤 닫는다', async () => {
    const { onClose } = await 연다([저장값케이스]);
    const 저장 = vi.spyOn(api, 'saveInput').mockResolvedValue(null);
    고친다('user2');

    Esc();
    expect(screen.getByText('고친 입력값이 저장되지 않았습니다 · 팀 모두와 정기 실행에 쓰입니다')).toBeTruthy();
    fireEvent.click(단추('저장하고 닫기'));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(저장).toHaveBeenCalledWith('ZRS-001', { params: { userId: 'user2' }, expected: {} });
  });

  it('「저장 안 하고 닫기」는 저장하지 않고 닫는다', async () => {
    const { onClose } = await 연다([저장값케이스]);
    const 저장 = vi.spyOn(api, 'saveInput');
    고친다('user2');

    Esc();
    fireEvent.click(단추('저장 안 하고 닫기'));

    expect(onClose).toHaveBeenCalledOnce();
    expect(저장).not.toHaveBeenCalled();
  });

  it('저장이 실패하면 닫지 않고 사유를 창에 보인다', async () => {
    const { onClose } = await 연다([저장값케이스]);
    vi.spyOn(api, 'saveInput').mockRejectedValue(new ApiError(500, 'INTERNAL', '저장소가 응답하지 않습니다', []));
    고친다('user2');

    Esc();
    fireEvent.click(단추('저장하고 닫기'));

    expect(await screen.findByText('저장소가 응답하지 않습니다')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('저장하고 나면 묻지 않고 닫힌다', async () => {
    const { onClose } = await 연다([저장값케이스]);
    vi.spyOn(api, 'saveInput').mockResolvedValue(null);
    고친다('user2');
    fireEvent.click(단추('이 값 저장'));
    await screen.findByText('저장값으로 저장했습니다.');

    Esc();

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('목록 상세 칸에서 고쳐 온 값은 창에서 손대지 않았으면 묻지 않고 닫는다 — 닫아도 목록에 남는다', async () => {
    const { onClose } = await 연다([저장값케이스], { 초기글자: { 'ZRS-001': { params: { userId: 'list' }, expected: {} } } });
    expect(screen.getByText('저장값과 다릅니다 · 이번 실행에만 씁니다')).toBeTruthy();

    Esc();

    expect(onClose).toHaveBeenCalledOnce();
  });
});
