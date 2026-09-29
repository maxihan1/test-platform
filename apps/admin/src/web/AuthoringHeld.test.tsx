// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringHeld as 보류줄, AuthoringRow } from './api.js';
import { AuthoringHeld } from './AuthoringHeld.js';
import { AuthoringTodo } from './AuthoringTodo.js';
import type { 판정 } from './role.js';

const 운영: 판정 = () => true;

const { 넣기, 지우기, 머지 } = vi.hoisted(() => ({
  넣기: vi.fn((_s: string, _id: number, _tc: string, _body: unknown) => Promise.resolve({ ok: true as const })),
  지우기: vi.fn((_s: string, _id: number, _tc: string) => Promise.resolve({ ok: true as const })),
  머지: vi.fn((_s: string, _id: number, _env?: string) => Promise.resolve({ id: 2 })),
}));

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: { putAuthoringHeld: 넣기, deleteAuthoringHeld: 지우기, createAuthoringMerge: 머지, authoringAssetUrl: 진짜.api.authoringAssetUrl },
  };
});

const 토스트: 보류줄 = {
  tcId: 'MKT-030',
  file: 'tests/mkt/toast.spec.ts',
  kind: 'UNDECIDABLE',
  reason: '판정 불가 — 알림이 사라졌다고 볼 기준이 기획서에 없다',
  fields: [
    { side: 'params', key: 'waitSec', description: '기다릴 시간(초)', type: 'number' },
    { side: 'expected', key: 'shownSec', description: '토스트가 보이는 시간(초)', type: 'number' },
  ],
  input: { params: { waitSec: 5 }, by: 'maxi', at: '2026-09-29T05:10:00.000Z' },
};
const 배너: 보류줄 = {
  tcId: 'MKT-033',
  file: 'tests/mkt/banner.spec.ts',
  kind: 'ON_HOLD',
  reason: '보류 — 관리자 화면이 훑기 범위 밖이다',
  fields: [{ side: 'expected', key: 'title', description: '배너 제목', type: 'string' }],
  input: null,
};
const 삭제글: 보류줄 = {
  tcId: 'MKT-035',
  file: 'tests/mkt/delete.spec.ts',
  kind: 'ON_HOLD',
  reason: '보류 — 글을 지워 전제가 무너진다',
  fields: [],
  input: { removed: true, by: 'maxi', at: '2026-09-29T05:16:00.000Z' },
};

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 7,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'DONE',
    stage: '끝',
    stageAt: new Date().toISOString(),
    requestedByName: '테스터',
    claimedBy: '맥',
    prUrl: 'https://github.com/x/y/pull/3',
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...덮을것,
  };
}

const reload = vi.fn();

beforeEach(() => {
  넣기.mockClear();
  지우기.mockClear();
  머지.mockClear();
  reload.mockClear();
});

afterEach(() => cleanup());

describe('보류 케이스 표', () => {
  it('보류가 없으면 표를 그리지 않는다', () => {
    const { container } = render(<AuthoringHeld service="MKT" 요청번호={7} held={[]} 편집 reload={reload} />);
    expect(container.innerHTML).toBe('');
  });

  it('줄마다 케이스 번호 · 칩 · 머리를 뗀 사유 · 상태를 보인다', () => {
    render(<AuthoringHeld service="MKT" 요청번호={7} held={[토스트, 배너, 삭제글]} 편집 reload={reload} />);
    expect(screen.getByRole('heading', { name: /보류 케이스/ })).toBeTruthy();
    expect(screen.getByText('MKT-030')).toBeTruthy();
    expect(screen.getByText('판정 불가')).toBeTruthy();
    expect(screen.getAllByText('보류')).toHaveLength(2);
    expect(screen.getByText('알림이 사라졌다고 볼 기준이 기획서에 없다')).toBeTruthy();
    expect(screen.getByText('tests/mkt/toast.spec.ts')).toBeTruthy();
    expect(screen.getAllByText('값 필요')).toHaveLength(2);
    expect(screen.getByText('제거함')).toBeTruthy();
  });

  it('값 넣기로 펼치고 칸을 벗어나면 그 케이스의 입력 전체를 PUT 으로 보낸다', async () => {
    render(<AuthoringHeld service="MKT" 요청번호={7} held={[토스트]} 편집 reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '값 넣기' }));
    expect(screen.getByText('넣을 값')).toBeTruthy();
    expect(screen.getByText('기대 결과')).toBeTruthy();
    const 칸 = screen.getByLabelText('토스트가 보이는 시간(초)');
    fireEvent.change(칸, { target: { value: '3' } });
    fireEvent.blur(칸);
    await vi.waitFor(() => expect(넣기).toHaveBeenCalledTimes(1));
    expect(넣기).toHaveBeenCalledWith('MKT', 7, 'MKT-030', { params: { waitSec: 5 }, expected: { shownSec: 3 } });
    expect(await screen.findByText('저장했습니다')).toBeTruthy();
    expect(reload).toHaveBeenCalled();
  });

  it('숫자 칸에 숫자가 아닌 것을 넣으면 보내지 않고 한 줄로 말한다', () => {
    render(<AuthoringHeld service="MKT" 요청번호={7} held={[토스트]} 편집 reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '값 넣기' }));
    const 칸 = screen.getByLabelText('토스트가 보이는 시간(초)');
    fireEvent.change(칸, { target: { value: '셋' } });
    fireEvent.blur(칸);
    expect(넣기).not.toHaveBeenCalled();
    expect(screen.getByText('숫자를 넣으세요')).toBeTruthy();
  });

  it('제거는 확인 상자 없이 removed 를 보낸다', async () => {
    render(<AuthoringHeld service="MKT" 요청번호={7} held={[배너]} 편집 reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '제거' }));
    await vi.waitFor(() => expect(넣기).toHaveBeenCalledWith('MKT', 7, 'MKT-033', { removed: true }));
  });

  it('되돌리기는 DELETE 를 부른다', async () => {
    render(<AuthoringHeld service="MKT" 요청번호={7} held={[삭제글]} 편집 reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    await vi.waitFor(() => expect(지우기).toHaveBeenCalledWith('MKT', 7, 'MKT-035'));
  });

  it('칸이 없는 케이스는 값 넣기 없이 제거만 있다 · 편집 권한이 없으면 버튼이 없다', () => {
    const { rerender } = render(<AuthoringHeld service="MKT" 요청번호={7} held={[{ ...삭제글, input: null }]} 편집 reload={reload} />);
    expect(screen.queryByRole('button', { name: '값 넣기' })).toBeNull();
    expect(screen.getByRole('button', { name: '제거' })).toBeTruthy();
    rerender(<AuthoringHeld service="MKT" 요청번호={7} held={[토스트]} 편집={false} reload={reload} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('다음 단계의 보류 진척과 반영', () => {
  it('남은 보류가 있으면 반영을 막고 이유를 한 줄로 말한다', () => {
    render(<AuthoringTodo service="MKT" 요청={줄({ held: [토스트, 배너, 삭제글], heldOpen: 2 })} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.getByText('보류 케이스 3건 중 1건 처리')).toBeTruthy();
    expect(screen.getByText('값 채움 0 · 제거 1')).toBeTruthy();
    expect(screen.getByRole('link', { name: '보류 케이스로 가기' }).getAttribute('href')).toBe('#held');
    const 버튼 = screen.getByRole('button', { name: '테스트 반영하기' });
    expect((버튼 as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('보류 케이스 2건이 남아 있어 아직 반영할 수 없습니다.')).toBeTruthy();
    expect(screen.getByText('반영하면 넣은 값을 테스트 코드에 적고, 값을 채운 케이스를 3번 돌려 모두 통과해야 합칩니다.')).toBeTruthy();
  });

  it('보류가 없으면 진척도 설명도 없고 반영은 대상 서버 없이 보낸다', async () => {
    render(<AuthoringTodo service="MKT" 요청={줄({ held: [], heldOpen: 0 })} 할수={운영} 차이수={0} reload={reload} />);
    expect(screen.queryByText(/보류 케이스/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '테스트 반영하기' }));
    await vi.waitFor(() => expect(머지).toHaveBeenCalledWith('MKT', 7, undefined));
  });

  it('정방향이고 값을 채웠으면 대상 서버를 골라 함께 보낸다', async () => {
    const 채운토스트 = { ...토스트, input: { params: { waitSec: 5 }, expected: { shownSec: 3 }, by: 'maxi', at: '2026-09-29T05:10:00.000Z' } };
    const envs = [
      { env: 'dev', baseUrl: 'https://dev.x' },
      { env: 'stg', baseUrl: 'https://stg.x' },
    ];
    render(
      <AuthoringTodo service="MKT" 요청={줄({ held: [채운토스트, 삭제글], heldOpen: 0 })} envs={envs} 할수={운영} 차이수={0} reload={reload} />,
    );
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'stg' } });
    fireEvent.click(screen.getByRole('button', { name: '테스트 반영하기' }));
    await vi.waitFor(() => expect(머지).toHaveBeenCalledWith('MKT', 7, 'stg'));
  });

  it('대조 요청은 원본의 대상 서버를 쓰므로 고르지 않는다', () => {
    const 채운토스트 = { ...토스트, input: { params: { waitSec: 5 }, expected: { shownSec: 3 }, by: 'maxi', at: '2026-09-29T05:10:00.000Z' } };
    render(
      <AuthoringTodo
        service="MKT"
        요청={줄({ compare: true, env: 'stg', held: [채운토스트], heldOpen: 0 })}
        envs={[{ env: 'stg', baseUrl: 'https://stg.x' }]}
        할수={운영}
        차이수={0}
        reload={reload}
      />,
    );
    expect(screen.queryByLabelText('대상 서버')).toBeNull();
  });

  it('서버가 HELD_OPEN 으로 막으면 코드 대신 한 줄 문장을 낸다', async () => {
    const { ApiError } = await vi.importActual<typeof import('./api.js')>('./api.js');
    머지.mockRejectedValueOnce(new ApiError(409, 'HELD_OPEN', ''));
    render(<AuthoringTodo service="MKT" 요청={줄({ held: [삭제글], heldOpen: 0 })} 할수={운영} 차이수={0} reload={reload} />);
    fireEvent.click(screen.getByRole('button', { name: '테스트 반영하기' }));
    expect(await screen.findByText('보류 케이스가 남아 있어 아직 반영할 수 없습니다. 새로 고쳐 보세요')).toBeTruthy();
  });
});
