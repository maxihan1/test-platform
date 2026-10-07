// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import {
  api,
  type FailureCase,
  type FailureDevice,
  type ItemStatus,
  type Paged,
  type Platform,
  type RunItemDetail,
  type RunItemSummary,
  type StepResult,
} from './api.js';
import { RunFailCards } from './RunFailCards.js';
import { 판정흐름 } from './Summary.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const RUN_ID = 5011;

type 확인 = [string, ItemStatus, unknown, unknown];

function 단계(seq: number, title: string, 확인들: 확인[], 덮을것: Partial<StepResult> = {}): StepResult {
  return {
    seq,
    title,
    status: 확인들.some((c) => c[1] === 'FAIL') ? 'FAIL' : 'PASS',
    durationMs: 1000,
    assertions: 확인들.map(([statement, status, expected, actual]) => ({ statement, status, expected, actual })),
    ...덮을것,
  };
}

const 기본단계 = (실제값: unknown = '없음'): StepResult[] => [
  단계(1, '로그인 양식을 채운다', [['입력 칸이 보인다', 'PASS', true, true]]),
  단계(2, '가입 버튼을 누른다', [
    ['가입 완료 안내가 보인다', 'PASS', true, true],
    ['가입한 이메일이 보인다', 'FAIL', 'new@demo.kr', 실제값],
  ]),
];

function 상세(historyId: number, platform: Platform, 덮을것: Partial<RunItemDetail> = {}): RunItemDetail {
  return {
    historyId,
    runId: RUN_ID,
    runTitle: '결제 회귀',
    tcId: 'ZZI-0001',
    tcName: '회원가입',
    platform,
    attempt: 1,
    params: {},
    paramSchema: {},
    status: 'FAIL',
    durationMs: 4200,
    error: null,
    startedAt: '2026-09-21T00:59:00.000Z',
    finishedAt: '2026-09-21T01:00:00.000Z',
    precondition: ['가입하지 않은 이메일'],
    expected: {},
    expectedSchema: {},
    steps: 기본단계(),
    ...덮을것,
  };
}

function 장치(platform: Platform, historyId: number, 덮을것: Partial<FailureDevice> = {}, 항목덮기: Partial<RunItemDetail> = {}): FailureDevice {
  return {
    platform,
    change: null,
    streak: null,
    recent: ['FAIL', 'PASS', 'PASS'],
    attempts: 1,
    failedAttempts: 1,
    item: 상세(historyId, platform, 항목덮기),
    ...덮을것,
  };
}

function 케이스(tcId: string, tcName: string, devices: FailureDevice[]): FailureCase {
  return { tcId, tcName, devices: devices.map((d) => ({ ...d, item: { ...d.item, tcId, tcName } })) };
}

function 쪽(items: FailureCase[], 덮을것: Partial<Paged<FailureCase>> = {}): Paged<FailureCase> {
  return { items, total: items.length, page: 1, pageSize: 5, ...덮을것 };
}

function 줄(historyId: number, tcId: string, platform: Platform, status: ItemStatus, 덮을것: Partial<RunItemSummary> = {}): RunItemSummary {
  return {
    historyId,
    tcId,
    tcName: '회원가입',
    platform,
    attempt: 1,
    params: {},
    paramSchema: {},
    status,
    durationMs: 3200,
    error: null,
    startedAt: '2026-09-21T00:59:00.000Z',
    finishedAt: '2026-09-21T01:00:00.000Z',
    ...덮을것,
  };
}

function 그리기(응답: Paged<FailureCase>, items: RunItemSummary[] = [줄(1, 'ZZI-0001', 'desktop', 'FAIL')], platform: Platform | 'ALL' = 'ALL') {
  const 부름 = vi.spyOn(api, 'failures').mockResolvedValue(응답);
  const 결과 = render(<RunFailCards runId={RUN_ID} env="qa" items={items} platform={platform} />);
  return { 부름, ...결과 };
}

describe('실패 케이스 카드 (실행 §8.3)', () => {
  it('케이스마다 카드 하나, 깨진 디바이스의 사전조건 · 입력 · 절차와 모든 확인을 펼친다', async () => {
    const 칸 = {
      params: {},
      paramSchema: { properties: { email: { description: '이메일', default: 'a@b.kr' } } },
    };
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [장치('desktop', 1, {}, 칸)]),
        케이스('ZZI-0002', '로그인', [장치('mobile', 2, {}, { precondition: ['가입한 계정'] })]),
      ]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0002', 'mobile', 'FAIL')],
    );

    const 카드들 = await screen.findAllByRole('article');
    expect(카드들).toHaveLength(2);
    const 첫 = within(카드들[0]!);
    expect(첫.getByText('ZZI-0001')).toBeDefined();
    expect(첫.getByText('회원가입')).toBeDefined();
    expect(첫.getByText('가입하지 않은 이메일')).toBeDefined();
    expect(첫.getByText('로그인 양식을 채운다')).toBeDefined();
    expect(첫.getByText('가입 버튼을 누른다')).toBeDefined();
    expect(첫.getByText('입력 칸이 보인다')).toBeDefined();
    expect(첫.getByText('가입 완료 안내가 보인다')).toBeDefined();
    expect(첫.getByText('가입한 이메일이 보인다')).toBeDefined();
    expect(within(카드들[1]!).getByText('가입한 계정')).toBeDefined();
  });

  it('입력 칸이 비어 박제되면 박제 스키마의 default 로, 비밀값은 가려서 적는다', async () => {
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [
          장치(
            'desktop',
            1,
            {},
            {
              params: { memo: '직접 적은 값' },
              paramSchema: {
                properties: {
                  email: { description: '이메일', default: 'a@b.kr' },
                  password: { description: '비밀번호', default: 'real-secret' },
                  memo: { description: '메모' },
                },
              },
            },
          ),
        ]),
      ]),
    );

    await screen.findByText('이메일');
    expect(screen.getByText('a@b.kr')).toBeDefined();
    expect(screen.getByText('********')).toBeDefined();
    expect(screen.getByText('직접 적은 값')).toBeDefined();
    expect(screen.queryByText('real-secret')).toBeNull();
  });

  it('같은 절차 · 같은 확인 · 같은 실제 값으로 깨진 디바이스는 절차를 한 번만 그리고 머리에 묶어 적는다', async () => {
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1), 장치('mobile', 2, {}, { durationMs: 4900 })])]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0001', 'mobile', 'FAIL')],
    );

    expect(await screen.findByText('PC · 모바일')).toBeDefined();
    expect(screen.getAllByText('가입 버튼을 누른다')).toHaveLength(1);
    expect(screen.getByText('4.20초')).toBeDefined();
    expect(screen.getByText('4.90초')).toBeDefined();
  });

  it('실제 값이 다르면 따로 그린다', async () => {
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [
          장치('desktop', 1, {}, { steps: 기본단계('없음') }),
          장치('mobile', 2, {}, { steps: 기본단계('비어 있음') }),
        ]),
      ]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0001', 'mobile', 'FAIL')],
    );

    await screen.findAllByText('가입 버튼을 누른다');
    expect(screen.getAllByText('가입 버튼을 누른다')).toHaveLength(2);
    expect(screen.queryByText('PC · 모바일')).toBeNull();
  });

  it('디바이스 머리에 변화 · 회차 · 소요 · 흐름 막대를 적는다', async () => {
    const 칸 = (실제값: string) => ({ steps: 기본단계(실제값) });
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [
          장치('desktop', 1, { change: '새로깨짐', recent: ['FAIL', 'PASS', 'PASS'] }, 칸('a')),
          장치('mobile', 2, { change: '계속깨짐', streak: 2, recent: ['FAIL', 'FAIL', 'PASS', 'PASS'] }, 칸('b')),
          장치('android', 3, { change: '계속깨짐', streak: 5, recent: ['FAIL', 'FAIL', 'FAIL', 'FAIL', 'FAIL'], attempts: 5, failedAttempts: 2 }, 칸('c')),
        ]),
        케이스('ZZI-0002', '로그인', [장치('desktop', 4, { change: null, streak: null })]),
      ]),
      [
        줄(1, 'ZZI-0001', 'desktop', 'FAIL'),
        줄(2, 'ZZI-0001', 'mobile', 'FAIL'),
        줄(3, 'ZZI-0001', 'android', 'FAIL'),
        줄(4, 'ZZI-0002', 'desktop', 'FAIL'),
      ],
    );

    const 카드들 = await screen.findAllByRole('article');
    const 첫 = within(카드들[0]!);
    expect(첫.getByText('신규 실패')).toBeDefined();
    expect(첫.getByText('연속 실패 2회')).toBeDefined();
    expect(첫.getByText('연속 실패 5회 이상')).toBeDefined();
    expect(첫.getByText('5회 중 2회 실패')).toBeDefined();
    expect(첫.getAllByText('qa 서버 · 이 실행까지')).toHaveLength(3);
    const 둘째 = within(카드들[1]!);
    expect(둘째.queryByText(/신규 실패|연속 실패|회 중/)).toBeNull();
    expect(둘째.getByText('qa 서버 · 이 실행까지')).toBeDefined();
  });

  it('확인 문장 없이 깨진 디바이스는 오류의 첫 줄만 적고 120자에서 자른다', async () => {
    const 멈춤 = (message: string) => ({
      steps: [단계(1, '페이지를 연다', [], { status: 'FAIL' as const })],
      error: { message },
    });
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [장치('desktop', 1, {}, 멈춤('서버에 닿지 못했습니다\n  at connect (net.js:12)\n  at run'))]),
        케이스('ZZI-0002', '로그인', [장치('desktop', 2, {}, 멈춤(`${'가'.repeat(130)}\n둘째 줄`))]),
      ]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0002', 'desktop', 'FAIL')],
    );

    expect(await screen.findByText('서버에 닿지 못했습니다')).toBeDefined();
    expect(screen.queryByText(/net\.js/)).toBeNull();
    expect(screen.getByText(`${'가'.repeat(120)}…`)).toBeDefined();
    expect(screen.queryByText(/둘째 줄/)).toBeNull();
  });

  it('확인이 있는 실패는 오류 문장을 따로 적지 않는다', async () => {
    그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1, {}, { error: { message: '숨길 원문 오류' } })])]));

    await screen.findByText('가입한 이메일이 보인다');
    expect(screen.queryByText(/숨길 원문 오류/)).toBeNull();
  });

  it('그 케이스의 통과 · 미실행 디바이스는 한 줄이고, 펼칠 때만 상세를 한 번 불러온다', async () => {
    const 상세부름 = vi.spyOn(api, 'item').mockResolvedValue(
      상세(2, 'mobile', {
        status: 'PASS',
        precondition: ['모바일 사전조건'],
        steps: [단계(1, '모바일 절차', [['모바일 확인', 'PASS', true, true]])],
      }),
    );
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]),
      [
        줄(1, 'ZZI-0001', 'desktop', 'FAIL'),
        줄(2, 'ZZI-0001', 'mobile', 'PASS', { durationMs: 3600 }),
        줄(3, 'ZZI-0001', 'android', 'NA', { durationMs: null }),
        줄(9, 'ZZI-0009', 'desktop', 'PASS'),
      ],
    );

    const 모바일 = await screen.findByRole('button', { name: /ZZI-0001.*모바일/ });
    expect(모바일.getAttribute('aria-expanded')).toBe('false');
    expect(모바일.getAttribute('aria-controls')).not.toBeNull();
    expect(screen.getByText('3.60초')).toBeDefined();
    expect(screen.getByRole('button', { name: /ZZI-0001.*Android 앱/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /ZZI-0009/ })).toBeNull();
    expect(상세부름).not.toHaveBeenCalled();

    fireEvent.click(모바일);
    expect(await screen.findByText('모바일 절차')).toBeDefined();
    expect(상세부름).toHaveBeenCalledTimes(1);
    expect(상세부름).toHaveBeenCalledWith(RUN_ID, 2);
    expect(screen.getByText('모바일 사전조건')).toBeDefined();
    expect(모바일.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(모바일);
    expect(모바일.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(모바일);
    expect(모바일.getAttribute('aria-expanded')).toBe('true');
    expect(상세부름).toHaveBeenCalledTimes(1);
  });

  it('펼친 상세를 불러오는 중이면 그 자리에 한 줄을, 못 불러오면 오류 한 줄을 적는다', async () => {
    vi.spyOn(api, 'item').mockRejectedValue(new Error('상세를 못 읽었습니다'));
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0001', 'mobile', 'PASS')],
    );

    fireEvent.click(await screen.findByRole('button', { name: /ZZI-0001.*모바일/ }));
    expect(screen.getByText('불러오는 중입니다.')).toBeDefined();
    expect(await screen.findByText('상세를 못 읽었습니다')).toBeDefined();
  });

  it('디바이스 거르개가 바뀌면 서버에 다시 묻고 화면이 거르지 않는다', async () => {
    const { 부름, rerender } = 그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]));
    await screen.findByRole('article');
    expect(부름.mock.calls[0]).toEqual([RUN_ID, 1, undefined]);

    rerender(<RunFailCards runId={RUN_ID} env="qa" items={[줄(1, 'ZZI-0001', 'desktop', 'FAIL')]} platform="mobile" />);
    await waitFor(() => expect(부름).toHaveBeenCalledTimes(2));
    expect(부름.mock.calls[1]).toEqual([RUN_ID, 1, 'mobile']);
  });

  it('쪽이 둘 이상이면 이전 · 다음이 있고, 쪽을 넘기면 포커스가 카드 목록 머리로 간다', async () => {
    const 첫쪽 = 쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)]), 케이스('ZZI-0002', '로그인', [장치('desktop', 2)])], { pageSize: 2, total: 3 });
    const 둘째쪽 = 쪽([케이스('ZZI-0003', '결제', [장치('desktop', 3)])], { pageSize: 2, total: 3, page: 2 });
    const 부름 = vi.spyOn(api, 'failures').mockResolvedValueOnce(첫쪽).mockResolvedValueOnce(둘째쪽);
    render(
      <RunFailCards
        runId={RUN_ID}
        env="qa"
        items={[줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0002', 'desktop', 'FAIL'), 줄(3, 'ZZI-0003', 'desktop', 'FAIL')]}
        platform="ALL"
      />,
    );

    const 다음 = await screen.findByRole('button', { name: '다음' });
    expect((screen.getByRole('button', { name: '이전' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(다음);

    expect(await screen.findByText('ZZI-0003')).toBeDefined();
    expect(부름.mock.calls[1]).toEqual([RUN_ID, 2, undefined]);
    const 머리 = screen.getByRole('heading', { name: /실패한 케이스/ });
    await waitFor(() => expect(document.activeElement).toBe(머리));
    expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('쪽이 하나뿐이면 이전 · 다음을 그리지 않는다', async () => {
    그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]));

    await screen.findByRole('article');
    expect(screen.queryByRole('button', { name: '다음' })).toBeNull();
  });

  it('불러오는 중과 실패는 한 줄로 적는다', async () => {
    vi.spyOn(api, 'failures').mockReturnValue(new Promise(() => undefined));
    render(<RunFailCards runId={RUN_ID} env="qa" items={[줄(1, 'ZZI-0001', 'desktop', 'FAIL')]} platform="ALL" />);
    expect(screen.getByText('불러오는 중입니다.')).toBeDefined();

    cleanup();
    vi.restoreAllMocks();
    vi.spyOn(api, 'failures').mockRejectedValue(new Error('카드를 못 읽었습니다'));
    render(<RunFailCards runId={RUN_ID} env="qa" items={[줄(1, 'ZZI-0001', 'desktop', 'FAIL')]} platform="ALL" />);
    expect(await screen.findByText('카드를 못 읽었습니다')).toBeDefined();
  });

  it('항목이 하나도 없으면 통로를 부르지 않고, 서버가 빈 쪽을 줘도 같은 한 줄을 적는다', async () => {
    const 부름 = vi.spyOn(api, 'failures').mockResolvedValue(쪽([]));
    render(<RunFailCards runId={RUN_ID} env="qa" items={[]} platform="ALL" />);
    expect(screen.getByText('실패한 케이스가 없습니다')).toBeDefined();
    expect(부름).not.toHaveBeenCalled();

    cleanup();
    render(<RunFailCards runId={RUN_ID} env="qa" items={[줄(1, 'ZZI-0001', 'desktop', 'PASS')]} platform="ALL" />);
    expect(await screen.findByText('실패한 케이스가 없습니다')).toBeDefined();
  });

  it('카드에 상세 보기 링크가 있다 — 코드 뷰는 상세에만 둔다', async () => {
    그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 17)])]));

    const 링크 = await screen.findByRole('link', { name: '상세 보기' });
    expect(링크.getAttribute('href')).toBe(`#/runs/${RUN_ID}/items/17`);
    expect(screen.queryByText('실패 지점 코드')).toBeNull();
  });
});

describe('판정흐름의 앞말', () => {
  it('앞말을 주면 그 글과 「맨 앞이 이번 실행」 읽기 글이 붙고, 안 주면 지금과 같다', () => {
    const { container, rerender } = render(<판정흐름 recent={['FAIL', 'PASS']} />);
    expect(container.querySelectorAll('.spark i')).toHaveLength(5);
    expect(screen.queryByText('맨 앞이 이번 실행')).toBeNull();

    rerender(<판정흐름 recent={['FAIL', 'PASS']} 앞말="qa 서버 · 이 실행까지" />);
    expect(screen.getByText('qa 서버 · 이 실행까지')).toBeDefined();
    expect(screen.getByText('맨 앞이 이번 실행')).toBeDefined();
    expect(container.querySelectorAll('.spark i')).toHaveLength(5);
  });
});
