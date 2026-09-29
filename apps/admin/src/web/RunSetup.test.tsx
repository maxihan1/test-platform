// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError, type CaseRow, type ServiceRow, type User } from './api.js';
import { RunSetup } from './RunSetup.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 케이스: CaseRow = {
  tcId: 'ZRS-001',
  name: '실행 설정 케이스',
  platforms: ['desktop'],
  precondition: [],
  filePath: 'tests/ZRS-001.spec.ts',
  paramSchema: {},
  expectedSchema: {},
  isActive: true,
  scannedAt: '2026-09-21T00:00:00.000Z',
};

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZRS',
  name: '실행 서비스',
  color: '#3A5FCD',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 사람: User = {
  username: 'zrs1',
  displayName: '김실행',
  role: 'member',
  dashboard: 'read',
  mustChangePassword: false,
  services: [서비스],
};

async function 그린다(row: CaseRow = 케이스, 누구: User = 사람) {
  vi.spyOn(api, 'caseOf').mockResolvedValue(row);
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
  const 만들기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 5 });
  render(<RunSetup tcId={row.tcId} service={서비스} user={누구} />);
  await screen.findByDisplayValue(`${row.tcId} 실행`);
  return 만들기;
}

function 실행버튼() {
  return screen.getByText('실행') as HTMLButtonElement;
}

describe('실행 설정 화면 (SPEC §8.2)', () => {
  it('대상 서버를 고르지 않고 실행을 누르면 실행이 걸리지 않고 사유가 화면 글자로 뜬다', async () => {
    const 만들기 = await 그린다();

    expect(실행버튼().disabled).toBe(false);
    fireEvent.click(실행버튼());

    expect(만들기).not.toHaveBeenCalled();
    expect(screen.getByText('대상 서버를 고르세요. 증적에는 어느 서버에서 실행했는지가 꼭 남아야 합니다.')).toBeTruthy();
  });

  it('대상 서버를 고르면 그 서버로 실행이 걸린다', async () => {
    const 만들기 = await 그린다();

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(실행버튼());

    expect(만들기).toHaveBeenCalledTimes(1);
    expect(만들기.mock.calls[0]?.[0].env).toBe('qa');
  });

  it('만들어질 실행 항목이 1000건을 넘으면 실행 버튼이 죽고 지금 건수를 함께 적는다', async () => {
    const 만들기 = await 그린다();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    fireEvent.change(screen.getByLabelText('반복 횟수'), { target: { value: '1001' } });

    expect(실행버튼().disabled).toBe(true);
    expect(screen.getByText('한 번에 1000건까지 만들 수 있습니다 (지금 1001건)')).toBeTruthy();
    fireEvent.click(실행버튼());
    expect(만들기).not.toHaveBeenCalled();
  });

  it('딱 1000건은 막지 않는다', async () => {
    const 만들기 = await 그린다();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    fireEvent.change(screen.getByLabelText('반복 횟수'), { target: { value: '1000' } });

    expect(실행버튼().disabled).toBe(false);
    expect(screen.getByText('실행 항목이 1000건 생깁니다')).toBeTruthy();
    fireEvent.click(실행버튼());
    expect(만들기).toHaveBeenCalledTimes(1);
  });

  it('비밀값 칸은 가려서 입력받고 글자로 되돌려 보여주지 않는다', async () => {
    await 그린다({
      ...케이스,
      paramSchema: {
        type: 'object',
        properties: { password: { type: 'string', description: '비밀번호' } },
        required: ['password'],
      },
    });

    const 칸 = screen.getByLabelText('비밀번호') as HTMLInputElement;
    expect(칸.type).toBe('password');

    fireEvent.change(칸, { target: { value: 'hunter2' } });
    expect((screen.getByLabelText('비밀번호') as HTMLInputElement).type).toBe('password');
    expect(screen.queryByText('hunter2')).toBeNull();
  });
});

// 묶음 저장은 케이스 쓰기다. 읽기면 자리가 아예 없다 (화면공통 §8)
describe('실행 설정의 권한 칸', () => {
  it('케이스 쓰기면 묶음 저장이 보인다', async () => {
    await 그린다();
    expect(screen.getByText('이 값을 묶음으로 저장')).toBeTruthy();
  });

  it('케이스 읽기면 묶음 저장도 묶음 이름 칸도 없다', async () => {
    const 읽기만: User = { ...사람, services: [{ ...서비스, permissions: { cases: 'read', runs: 'write', authoring: 'write' } }] };
    await 그린다(케이스, 읽기만);
    expect(screen.queryByText('이 값을 묶음으로 저장')).toBeNull();
    expect(screen.queryByPlaceholderText('묶음 이름')).toBeNull();
  });

  it('실행 읽기면 실행 버튼이 없다', async () => {
    const 보기만: User = { ...사람, services: [{ ...서비스, permissions: { cases: 'read', runs: 'read', authoring: 'none' } }] };
    await 그린다(케이스, 보기만);
    expect(screen.queryByRole('button', { name: '실행' })).toBeNull();
  });
});

const 저장값케이스: CaseRow = {
  ...케이스,
  paramSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: '아이디', default: 'guest' },
      password: { type: 'string', description: '비밀번호' },
    },
  },
  savedInput: { params: { userId: 'user1' }, expected: {}, savedSecrets: { params: ['password'], expected: [] }, savedBy: '맥시', savedAt: '2026-09-29T05:02:00.000Z' },
};

describe('실행 설정의 저장값 (도메인/실행 §8.2, 2026-09-29 시안 A)', () => {
  it('저장값이 있으면 입력값 머리에 누가 저장했는지가 보인다', async () => {
    await 그린다(저장값케이스);
    expect(screen.getByText(/저장값 · 맥시 ·/)).toBeTruthy();
  });

  it('「다음에도 이 값으로 채우기」는 채운 값을 보내고 비워 둔 저장 비밀값은 안 보낸 뒤 케이스를 다시 읽는다', async () => {
    await 그린다(저장값케이스);
    const 저장 = vi.spyOn(api, 'saveInput').mockResolvedValue(null);
    const 읽기 = vi.mocked(api.caseOf);

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'user2' } });
    fireEvent.click(screen.getByRole('button', { name: '다음에도 이 값으로 채우기' }));

    await waitFor(() => expect(읽기).toHaveBeenCalledTimes(2));
    expect(저장).toHaveBeenCalledWith('ZRS-001', { params: { userId: 'user2' }, expected: {} });
    expect(screen.getByText('팀 모두와 정기 실행에 쓰입니다')).toBeTruthy();
  });

  it('서버가 400 을 내면 칸 아래에 사유를 붙인다', async () => {
    await 그린다(저장값케이스);
    vi.spyOn(api, 'saveInput').mockRejectedValue(
      new ApiError(400, 'INVALID_PARAMS', '아이디가 틀렸다', [{ path: 'userId', message: '아이디가 틀렸다' }]),
    );

    fireEvent.click(screen.getByRole('button', { name: '다음에도 이 값으로 채우기' }));

    expect(await screen.findByText('아이디가 틀렸다')).toBeTruthy();
  });

  it('「코드 기본값으로」는 그 자리에서 한 번 더 확인받고 지운 뒤 다시 읽는다', async () => {
    await 그린다(저장값케이스);
    const 지우기 = vi.spyOn(api, 'clearInput').mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: '코드 기본값으로' }));
    expect(지우기).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '지우기 확인' }));

    await waitFor(() => expect(vi.mocked(api.caseOf)).toHaveBeenCalledTimes(2));
    expect(지우기).toHaveBeenCalledWith('ZRS-001');
  });

  it('취소하면 지우지 않고 버튼이 돌아온다', async () => {
    await 그린다(저장값케이스);
    const 지우기 = vi.spyOn(api, 'clearInput').mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: '코드 기본값으로' }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(지우기).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '코드 기본값으로' })).toBeTruthy();
  });

  it('저장값이 없으면 「코드 기본값으로」가 없다', async () => {
    await 그린다();
    expect(screen.getByRole('button', { name: '다음에도 이 값으로 채우기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '코드 기본값으로' })).toBeNull();
  });

  it('케이스 읽기면 저장값 버튼이 없다', async () => {
    const 읽기만: User = { ...사람, services: [{ ...서비스, permissions: { cases: 'read', runs: 'write', authoring: 'write' } }] };
    await 그린다(저장값케이스, 읽기만);
    expect(screen.queryByRole('button', { name: '다음에도 이 값으로 채우기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '코드 기본값으로' })).toBeNull();
  });
});

describe('반드시 채울 비밀값 칸에 저장값이 있을 때', () => {
  it('칸을 비워 두고 실행을 누르면 막지 않고 그 칸을 빼고 보낸다 — 서버가 저장값으로 채운다', async () => {
    const 만들기 = await 그린다({
      ...저장값케이스,
      paramSchema: { ...저장값케이스.paramSchema, required: ['password'] },
    });

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(실행버튼());

    expect(만들기).toHaveBeenCalledTimes(1);
    expect(만들기.mock.calls[0]?.[0].items[0]?.params).toEqual({ userId: 'user1' });
  });
});

describe('묶음 이름이 비었을 때', () => {
  it('이름 칸으로 커서를 보내고 그 칸 옆에 사유를 적는다. 버튼은 살아 있다', async () => {
    await 그린다();
    const 저장 = vi.spyOn(api, 'saveParamSet');
    const 버튼 = screen.getByRole('button', { name: '이 값을 묶음으로 저장' }) as HTMLButtonElement;

    fireEvent.click(버튼);

    expect(버튼.disabled).toBe(false);
    expect(저장).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText('묶음 이름'));
    expect(screen.getByText('묶음 이름을 적으세요')).toBeTruthy();
  });

  it('이름을 적기 시작하면 사유가 사라진다', async () => {
    await 그린다();
    fireEvent.click(screen.getByRole('button', { name: '이 값을 묶음으로 저장' }));
    fireEvent.change(screen.getByLabelText('묶음 이름'), { target: { value: '회원' } });
    expect(screen.queryByText('묶음 이름을 적으세요')).toBeNull();
  });
  it('동작줄에 테스트 실행 버튼이 실행 옆에 있다', async () => {
    await 그린다();

    expect(screen.getByRole('button', { name: /테스트 실행/ })).toBeTruthy();
  });
});
