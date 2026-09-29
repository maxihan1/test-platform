// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, ApiError, type ServiceRow, type TrialState, type User } from './api.js';
import { TestRun, 열주소기본값 } from './TestRun.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZTR',
  name: '시험 서비스',
  color: '#3A5FCD',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 쓰는사람: User = {
  username: 'ztr1',
  displayName: '김실행',
  role: 'member',
  dashboard: 'read',
  mustChangePassword: false,
  services: [서비스],
};

const 읽는사람: User = { ...쓰는사람, services: [{ ...서비스, permissions: { cases: 'write', runs: 'read', authoring: 'write' } }] };

function 그리기(덮어쓸: Partial<Parameters<typeof TestRun>[0]> = {}) {
  const on검증실패 = vi.fn();
  const 결과 = render(
    <TestRun
      tcId="ZTR-001"
      user={쓰는사람}
      platforms={['desktop']}
      params={{ loginId: 'a' }}
      expected={{ ok: true }}
      대상주소="http://demo:3002"
      on검증실패={on검증실패}
      {...덮어쓸}
    />,
  );
  return { ...결과, on검증실패 };
}

const 버튼 = () => screen.getByRole('button', { name: /테스트 실행/ });
const 주소칸 = () => screen.getByLabelText('열 주소') as HTMLInputElement;

async function 누르기() {
  await act(async () => {
    fireEvent.click(버튼());
  });
}

async function 흘리기(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const 끝: TrialState = {
  status: 'DONE',
  result: {
    status: 'FAIL',
    durationMs: 2300,
    steps: [
      { seq: 1, title: '로그인한다', status: 'PASS', durationMs: 100, assertions: [] },
      { seq: 2, title: '목록을 확인한다', status: 'FAIL', durationMs: 50, assertions: [], error: { message: '행이 없습니다' } },
    ],
  },
};

describe('열주소기본값', () => {
  it('점 없는 Docker 안 이름은 localhost 로 바꾼다', () => {
    expect(열주소기본값('http://demo:3002')).toBe('http://localhost:3002');
    expect(열주소기본값('http://demo:3002/app?x=1')).toBe('http://localhost:3002/app?x=1');
  });

  it('점이 있는 호스트·localhost·IP 는 그대로다', () => {
    expect(열주소기본값('https://qa.example.com')).toBe('https://qa.example.com');
    expect(열주소기본값('http://localhost:3000')).toBe('http://localhost:3000');
    expect(열주소기본값('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
    expect(열주소기본값('http://[::1]:3000')).toBe('http://[::1]:3000');
  });

  it('주소가 없으면 빈 글자다', () => {
    expect(열주소기본값(null)).toBe('');
  });
});

describe('TestRun', () => {
  it('실행 쓰기 권한이 없으면 버튼이 없다', () => {
    그리기({ user: 읽는사람 });

    expect(screen.queryByRole('button', { name: /테스트 실행/ })).toBeNull();
  });

  it('누르면 열 주소·입력값으로 POST 하고 도는 동안 실행 중을 보인다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'RUNNING' });
    그리기();

    await 누르기();

    expect(시작).toHaveBeenCalledWith('ZTR-001', {
      platform: 'desktop',
      baseUrl: 'http://localhost:3002',
      params: { loginId: 'a' },
      expected: { ok: true },
    });
    expect(screen.getByText('테스트를 실행하는 중입니다')).toBeTruthy();
    expect(screen.getByText('실행 기록에 남지 않습니다 · 24시간 뒤 사라집니다')).toBeTruthy();
  });

  it('끝나면 결과 배지·단계·소요 시간을 보이고 폴링을 멈춘다', async () => {
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    const 조회 = vi.spyOn(api, 'getTrial').mockResolvedValueOnce({ status: 'RUNNING' }).mockResolvedValue(끝);
    const { container } = 그리기();

    await 누르기();
    await 흘리기(5000);

    expect(container.querySelector('.trial-head .verdict')?.textContent).toBe('실패');
    expect(screen.getByText('로그인한다')).toBeTruthy();
    expect(screen.getByText('목록을 확인한다').closest('li')?.className).toContain('fail');
    expect(screen.getByText('행이 없습니다')).toBeTruthy();
    expect(screen.getByText('2.30초')).toBeTruthy();

    const 횟수 = 조회.mock.calls.length;
    await 흘리기(10000);
    expect(조회.mock.calls.length).toBe(횟수);
  });

  it('언마운트하면 폴링이 멈춘다', async () => {
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    const 조회 = vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'RUNNING' });
    const { unmount } = 그리기();

    await 누르기();
    await 흘리기(3000);
    const 횟수 = 조회.mock.calls.length;
    expect(횟수).toBeGreaterThan(0);

    unmount();
    await 흘리기(10000);
    expect(조회.mock.calls.length).toBe(횟수);
  });

  it('열 주소가 http(s) 가 아니면 보내지 않고 칸 아래에 사유를 적는다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial');
    그리기();

    fireEvent.change(주소칸(), { target: { value: 'file:///etc/passwd' } });
    await 누르기();

    expect(시작).not.toHaveBeenCalled();
    expect(screen.getByText('열 주소는 http:// 또는 https:// 로 시작해야 합니다')).toBeTruthy();
  });

  it('TRIAL_OFF 면 켜는 법 안내를 보인다', async () => {
    vi.spyOn(api, 'startTrial').mockRejectedValue(new ApiError(409, 'TRIAL_OFF', '꺼짐'));
    그리기();

    await 누르기();

    expect(screen.getByText('이 서버에는 테스트 실행이 켜져 있지 않습니다. 켜는 법은 SETUP')).toBeTruthy();
  });

  it('TRIAL_BUSY 면 이미 돌고 있다고 알린다', async () => {
    vi.spyOn(api, 'startTrial').mockRejectedValue(new ApiError(409, 'TRIAL_BUSY', ''));
    그리기();

    await 누르기();

    expect(screen.getByText('이미 테스트 실행이 돌고 있습니다')).toBeTruthy();
  });

  it('칸별 사유가 오면 호출한 쪽에 넘긴다', async () => {
    const 오류 = new ApiError(400, 'INVALID_PARAMS', '', [{ path: 'loginId', message: '필요합니다' }]);
    vi.spyOn(api, 'startTrial').mockRejectedValue(오류);
    const { on검증실패 } = 그리기();

    await 누르기();

    expect(on검증실패).toHaveBeenCalledWith(오류);
  });

  it('러너에 못 닿아 NA 로 끝나면 서버가 준 문장을 그대로 보인다', async () => {
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockResolvedValue({
      status: 'DONE',
      result: { status: 'NA', durationMs: 10, steps: [], error: { message: '내 컴퓨터 러너를 켜세요: npm run runner:local' } },
    });
    그리기();

    await 누르기();
    await 흘리기(3000);

    expect(screen.getByText('내 컴퓨터 러너를 켜세요: npm run runner:local')).toBeTruthy();
  });

  it('디바이스를 하나도 안 골랐으면 보내지 않고 사유를 보인다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial');
    그리기({ platforms: [] });

    await 누르기();

    expect(시작).not.toHaveBeenCalled();
    expect(screen.getByText('실행할 디바이스를 하나 이상 고르세요.')).toBeTruthy();
  });
});
