// @vitest-environment jsdom
// 케이스 목록의 「여러 건 고르기」 검사 (SPEC §8.1).
//
// 가장 비싼 축은 ③ 「전체」다. 서버가 한 쪽씩만 주므로 화면이 손에 든 쪽만 담으면
// 51건째부터 조용히 빠지는데 버튼은 「전체」라고 말한다. 그래서 여기서는
// `api.cases` 가 **쪽마다 불렸는지**를 본다 — 한 쪽만 받고 끝나면 실패해야 한다.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, ApiError, type CaseRow, type Paged, type Platform, type ServiceRow, type User } from './api.js';
import { CaseList } from './CaseList.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// 앞 검사가 옮겨 놓은 주소가 다음 검사의 「안 옮겼다」 단언을 통과시켜 버린다
beforeEach(() => {
  window.location.hash = '#/cases';
});

function 케이스(tcId: string, platforms: Platform[] = ['desktop'], isActive = true): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms,
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive,
    scannedAt: '2026-09-21T00:00:00.000Z',
  };
}

// 한 쪽 크기를 2로 두면 2건짜리 쪽은 「더 있다」, 1건짜리 쪽은 「끝」이다 (paging.ts)
const 쪽1: Paged<CaseRow> = { items: [케이스('ZPK-001'), 케이스('ZPK-002')], total: 3, page: 1, pageSize: 2 };
// 디바이스 수가 다른 케이스를 섞는다. items 를 곱으로 세면 여기서 어긋난다
const 쪽2: Paged<CaseRow> = { items: [케이스('ZPK-003', ['desktop', 'mobile'])], total: 3, page: 2, pageSize: 2 };

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZPK',
  name: '결제',
  color: '#123456',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
};

const 사람: User = { username: 'zpk', displayName: '검사', role: 'operator', services: [서비스] };

/** 마운트에서 부르는 셋과 대상 서버를 읽는 통로를 막는다. cases 만 시험 대상이다 */
function 모킹(cases: (page: number) => Promise<Paged<CaseRow>>) {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
  return vi.spyOn(api, 'cases').mockImplementation((q) => cases(q.page ?? 1));
}

const 쪽주기 = (page: number) => Promise.resolve(page === 1 ? 쪽1 : 쪽2);

async function 그리기(cases: (page: number) => Promise<Paged<CaseRow>> = 쪽주기) {
  const 스파이 = 모킹(cases);
  const 것 = render(<CaseList service="ZPK" />);
  await screen.findByText('ZPK-001');
  return { ...것, 스파이 };
}

const 고르기칸 = () => screen.getAllByRole('checkbox');
const 실행버튼 = () => screen.getByRole('button', { name: /(전체|건) 실행$/ });
// 모달의 버튼은 글자가 딱 '실행'이다. 목록 쪽은 앞에 '전체'·'선택한 N건'이 붙는다
const 모달실행 = () => screen.getByRole('button', { name: '실행' });

describe('CaseList 집계 띠', () => {
  it('목록 위에 판정 넷이 숫자와 글자 라벨로 같이 뜬다', async () => {
    await 그리기();
    const 띠 = document.querySelector('.stats');
    expect(띠).not.toBeNull();
    const 글 = 띠?.textContent ?? '';
    for (const 라벨 of ['전체', '통과', '실패', '미실행']) expect(글).toContain(라벨);
  });

  it('숫자는 지금 보이는 것을 센다', async () => {
    await 그리기();
    const 칸들 = [...document.querySelectorAll('.stats .stat .v')].map((el) => el.textContent);
    expect(칸들[0]).toBe('2');
  });
});

// 창 794px 중 564px 을 위아래 UI 가 먼저 가져가 표에 206px(1.5줄)만 남았다 (2026-09-22 실측).
// 스캔 줄 49px 과 필터 둘째 줄 66px 이 그 안에 있다
describe('스캔 결과가 화면 머리에 있다 (SPEC §8.1, 2026-09-22)', () => {
  const 스캔 = {
    scannedAt: '2026-09-22T05:51:00.000Z',
    added: 0,
    updated: 11,
    deactivated: 0,
    duplicates: [],
  };

  async function 스캔그리기(값: unknown, 오류: unknown = null) {
    vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] });
    vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
    vi.spyOn(api, 'cases').mockImplementation((q) => 쪽주기(q.page ?? 1));
    if (오류 === null) {
      vi.spyOn(api, 'lastScan').mockResolvedValue(값 as never);
    } else {
      vi.spyOn(api, 'lastScan').mockRejectedValue(오류);
    }
    render(<CaseList service="ZPK" />);
    await screen.findByText('ZPK-001');
  }

  it('스캔 결과가 화면 머리 안에 있고 따로 줄을 만들지 않는다', async () => {
    await 스캔그리기(스캔);
    await waitFor(() => {
      expect(document.querySelector('.head')?.textContent ?? '').toMatch(/갱신 11/);
    });
    expect(document.querySelector('.scan'), '스캔 줄이 따로 서 있다').toBeNull();
  });

  // 카탈로그 §8.1 — 「스캔이 실패했으면 그 사유를 같은 자리에 보여준다」.
  // 자리가 머리로 옮겨 가도 그 규칙은 따라간다
  it('스캔이 실패하면 사유도 같은 자리에 뜬다', async () => {
    await 스캔그리기(null, new ApiError(500, 'SCAN_FAILED', 'ZPK-001이 두 파일에 겹쳐 있습니다'));
    await waitFor(() => {
      expect(document.querySelector('.head')?.textContent ?? '').toContain('겹쳐 있습니다');
    });
  });

  it('찾기와 조건 칩이 한 줄에 선다', async () => {
    await 스캔그리기(스캔);
    expect(document.querySelectorAll('.toolbar')).toHaveLength(1);
  });
});

describe('CaseList 여러 건 고르기', () => {
  it('줄마다 고르는 칸이 있고 무엇을 고르는지 이름으로 읽힌다', async () => {
    await 그리기();
    expect(고르기칸()).toHaveLength(2);
    // ID 만 읽으면 화면을 안 보는 사람에게는 암호다
    expect(screen.getByRole('checkbox', { name: 'ZPK-001 ZPK-001 케이스 고르기' })).toBeTruthy();
  });

  it('아무것도 안 고르면 버튼 글자가 전체 실행이다', async () => {
    await 그리기();
    expect(실행버튼().textContent).toBe('전체 실행');
  });

  it('고른 수만큼 버튼 글자가 바뀐다', async () => {
    await 그리기();
    fireEvent.click(고르기칸()[0]!);
    expect(실행버튼().textContent).toBe('선택한 1건 실행');
    fireEvent.click(고르기칸()[1]!);
    expect(실행버튼().textContent).toBe('선택한 2건 실행');
  });

  it('전체 실행을 누르면 마지막 쪽까지 쪽마다 받아 모은다', async () => {
    const { 스파이 } = await 그리기();
    스파이.mockClear();

    fireEvent.click(실행버튼());

    await waitFor(() => {
      const 받은쪽 = 스파이.mock.calls.map(([q]) => q.page);
      expect(받은쪽).toEqual([1, 2]);
    });
  });

  it('받는 동안 버튼이 막히고 그 사실이 화면 줄로 뜬다', async () => {
    let 풀기: ((쪽: Paged<CaseRow>) => void) | null = null;
    // 두 번째 쪽을 손에 쥐고 있어야 「받는 중」 이 화면에 떠 있는 순간을 붙잡을 수 있다
    await 그리기((page) =>
      page === 1
        ? Promise.resolve(쪽1)
        : new Promise<Paged<CaseRow>>((resolve) => {
            풀기 = resolve;
          }),
    );

    fireEvent.click(실행버튼());

    await waitFor(() => {
      expect(실행버튼().hasAttribute('disabled')).toBe(true);
      expect(screen.getByRole('status').textContent).toContain('케이스 목록을 모으는 중');
    });
    // 말풍선이 아니라 화면 줄이어야 한다 (DESIGN.md 접근성 기준)
    expect(실행버튼().hasAttribute('title')).toBe(false);

    await waitFor(() => expect(풀기).not.toBeNull());
    풀기!(쪽2);

    // 다 모으면 확인 모달이 뜬다. 닫아야 목록의 화면 줄이 다시 혼자가 된다
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    await waitFor(() => expect(실행버튼().hasAttribute('disabled')).toBe(false));
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('CaseList 고른 것을 줄 통째로 든다', () => {
  it('고른 것이 있으면 쪽을 되돌지 않는다', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.click(고르기칸()[0]!);
    스파이.mockClear();

    fireEvent.click(실행버튼());

    const 모달 = await screen.findByRole('dialog');
    expect(모달.getAttribute('aria-label')).toBe('실행할 케이스 1건');
    // 1건을 고르고 21쪽까지 되도는 일이 없어야 한다. 손에 이미 다 있다
    expect(스파이).not.toHaveBeenCalled();
  });

  it('결과 칩을 바꿔도 고른 것이 말없이 빠지지 않는다', async () => {
    await 그리기();
    fireEvent.click(고르기칸()[0]!);
    fireEvent.click(고르기칸()[1]!);

    // 칩은 「무엇을 볼까」이지 「무엇을 돌릴까」가 아니다. 마지막 결과가 없어 전부 미실행이다
    fireEvent.click(screen.getByRole('button', { name: '실패' }));
    expect(실행버튼().textContent).toBe('선택한 2건 실행');
    fireEvent.click(실행버튼());

    const 모달 = await screen.findByRole('dialog');
    expect(모달.getAttribute('aria-label')).toBe('실행할 케이스 2건');
  });

  it('서비스를 바꾸면 고른 것도 버린다', async () => {
    const { rerender } = await 그리기();
    fireEvent.click(고르기칸()[0]!);
    expect(실행버튼().textContent).toBe('선택한 1건 실행');

    rerender(<CaseList service="ZPY" />);

    // 남겨 두면 다른 서비스에서 「고른 1건」이라 말하고 누르면 사실이 아닌 이유를 보여준다
    await waitFor(() => expect(실행버튼().textContent).toBe('전체 실행'));
  });
});

describe('CaseList 담지 못한 것을 말한다', () => {
  it('쪽이 끝없이 이어져도 멈추고 전부 담지 못했다고 말한다', async () => {
    // 늘 꽉 찬 쪽을 준다. 쪽 상한이 없으면 영영 돈다 (다음이있나 는 items.length >= pageSize 다)
    const 스파이 = 모킹((page) =>
      Promise.resolve({
        items: [케이스(`ZPK-${String(page)}A`), 케이스(`ZPK-${String(page)}B`)],
        total: 9999,
        page,
        pageSize: 2,
      }),
    );
    render(<CaseList service="ZPK" />);
    await screen.findByText('ZPK-1A');
    스파이.mockClear();

    fireEvent.click(실행버튼());

    const 모달 = await screen.findByRole('dialog');
    expect(스파이).toHaveBeenCalledTimes(40);
    expect(모달.getAttribute('aria-label')).toBe('실행할 케이스 80건');
    // 버튼 글자가 「전체」인 채로 조용히 자르지 않는다
    expect(within(모달).getByText(/앞 80건까지만 담았습니다/)).toBeTruthy();
  });

  it('같은 tcId 가 두 쪽에 실려도 한 번만 담는다', async () => {
    // 도는 중에 스캔이 돌면 이렇게 된다. 겹친 채로 보내면 서버가 요청 전체를 거절한다
    await 그리기((page) =>
      Promise.resolve(
        page === 1
          ? 쪽1
          : { items: [케이스('ZPK-002')], total: 3, page: 2, pageSize: 2 },
      ),
    );

    fireEvent.click(실행버튼());

    const 모달 = await screen.findByRole('dialog');
    expect(모달.getAttribute('aria-label')).toBe('실행할 케이스 2건');
  });

  it('고른 것 중 비활성이 빠지면 몇 건이 대상인지 적는다', async () => {
    await 그리기(() =>
      Promise.resolve({
        items: [케이스('ZPK-001'), 케이스('ZPK-009', ['desktop'], false)],
        total: 2,
        page: 1,
        pageSize: 9,
      }),
    );
    fireEvent.click(고르기칸()[0]!);
    fireEvent.click(고르기칸()[1]!);

    fireEvent.click(실행버튼());

    const 모달 = await screen.findByRole('dialog');
    expect(within(모달).getByText(/고른 2건 중 1건이 대상입니다/)).toBeTruthy();
  });
});

describe('CaseList 여러 건 실행 걸기', () => {
  /** 모달을 열고 대상 서버까지 고른 자리. 안 고르면 모달이 자기 사유를 내고 멈춘다 */
  async function 모달까지() {
    const 것 = await 그리기();
    fireEvent.click(실행버튼());
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    return 것;
  }

  it('모으기가 끝나면 모은 케이스로 모달이 뜬다', async () => {
    await 그리기();

    fireEvent.click(실행버튼());

    const 모달 = await screen.findByRole('dialog');
    expect(모달.getAttribute('aria-label')).toBe('실행할 케이스 3건');
    expect(screen.getAllByText('ZPK-003')).not.toHaveLength(0);
  });

  it('모달을 닫으면 모은 것을 버린다', async () => {
    await 모달까지();

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('실행을 누르면 담은 건수만큼의 items 로 createRun 이 불린다', async () => {
    const 걸기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 7 });
    await 모달까지();

    fireEvent.click(모달실행());

    await waitFor(() => expect(걸기).toHaveBeenCalledTimes(1));
    const 본문 = 걸기.mock.calls[0]![0];
    expect(본문.items).toHaveLength(3);
    expect(본문.items.map((it) => it.tcId)).toEqual(['ZPK-001', 'ZPK-002', 'ZPK-003']);
    // 디바이스는 케이스가 선언한 것을 그대로 쓴다. 한 자리에서 고르지 않는다 (SPEC §8.10)
    expect(본문.items.map((it) => it.platforms)).toEqual([['desktop'], ['desktop'], ['desktop', 'mobile']]);
    expect(본문.env).toBe('qa');
    // 실행 기록 목록이 제목으로 실행을 가린다. 수만 적으면 무엇을 돌렸는지 못 읽는다 (SPEC §8.2)
    expect(본문.title).toBe('ZPK-001 외 2건 실행');
  });

  it('거는 동안 실행이 막히고 그 사실이 버튼 글자로 뜬다', async () => {
    let 풀기: ((것: { runId: number }) => void) | null = null;
    // 응답을 손에 쥐고 있어야 「거는 중」 이 화면에 떠 있는 순간을 붙잡을 수 있다
    vi.spyOn(api, 'createRun').mockImplementation(
      () =>
        new Promise<{ runId: number }>((resolve) => {
          풀기 = resolve;
        }),
    );
    await 모달까지();

    fireEvent.click(모달실행());

    const 거는중 = await screen.findByRole('button', { name: '실행을 거는 중' });
    expect(거는중.hasAttribute('disabled')).toBe(true);
    // 말풍선이 아니라 버튼 글자다 (DESIGN.md 접근성 기준)
    expect(거는중.hasAttribute('title')).toBe(false);

    await waitFor(() => expect(풀기).not.toBeNull());
    풀기!({ runId: 11 });

    await waitFor(() => expect(window.location.hash).toBe('#/runs/11'));
  });

  it('성공하면 그 실행 결과 화면으로 간다', async () => {
    vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 7 });
    await 모달까지();

    fireEvent.click(모달실행());

    await waitFor(() => expect(window.location.hash).toBe('#/runs/7'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('400 이 오면 결과 화면으로 안 가고 모달 **안에** 사유가 뜬다', async () => {
    vi.spyOn(api, 'createRun').mockRejectedValue(
      new ApiError(400, 'CASE_NOT_FOUND', '카탈로그에 없는 케이스다: ZPK-003'),
    );
    await 모달까지();

    fireEvent.click(모달실행());

    // 목록 어딘가에 있기만 하면 통과하는 단언은 이 사고를 못 막는다.
    // 목록 줄은 잉크 40% 덮개 뒤에 깔려서 사람 눈에는 「아무 일도 안 일어난 것」이다
    const 모달 = screen.getByRole('dialog');
    await waitFor(() =>
      expect(within(모달).getByRole('status').textContent).toContain('카탈로그에 없는 케이스다: ZPK-003'),
    );
    expect(window.location.hash).toBe('#/cases');
  });

  it('한 번 거절당해도 실행을 다시 누를 수 있다', async () => {
    const 걸기 = vi
      .spyOn(api, 'createRun')
      .mockRejectedValueOnce(new ApiError(400, 'ENV_NOT_FOUND', 'ZPK 서비스에 qa 대상 서버가 없다'))
      .mockResolvedValue({ runId: 9 });
    await 모달까지();

    fireEvent.click(모달실행());
    const 모달 = screen.getByRole('dialog');
    await waitFor(() => expect(within(모달).getByRole('status').textContent).toContain('대상 서버가 없다'));

    // 연타를 막는 빗장이 실패한 자리에서 안 풀리면 여기서 영영 못 누른다
    expect(모달실행().hasAttribute('disabled')).toBe(false);
    fireEvent.click(모달실행());

    await waitFor(() => expect(window.location.hash).toBe('#/runs/9'));
    expect(걸기).toHaveBeenCalledTimes(2);
  });

  it('값을 고치면 아까 거절당한 사유가 사라진다', async () => {
    vi.spyOn(api, 'createRun').mockRejectedValue(
      new ApiError(400, 'CASE_NOT_FOUND', '카탈로그에 없는 케이스다: ZPK-003'),
    );
    await 모달까지();
    fireEvent.click(모달실행());
    const 모달 = screen.getByRole('dialog');
    await waitFor(() => expect(within(모달).getByRole('status').textContent).toContain('ZPK-003'));

    fireEvent.change(screen.getByLabelText('반복'), { target: { value: '2' } });

    // 값을 고친 뒤에도 옛 사유가 남아 있으면 방금 고친 것이 또 거절당한 것처럼 읽힌다
    await waitFor(() => expect(within(모달).getByRole('status').textContent).toBe('실행 항목이 8건 생깁니다'));
  });

  it('모달을 닫으면 지난번 사유가 다음에 열 때 남지 않는다', async () => {
    vi.spyOn(api, 'createRun').mockRejectedValue(
      new ApiError(400, 'CASE_NOT_FOUND', '카탈로그에 없는 케이스다: ZPK-003'),
    );
    await 모달까지();
    fireEvent.click(모달실행());
    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByRole('status').textContent).toContain('ZPK-003'),
    );

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(실행버튼());

    const 다시 = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(within(다시).getByRole('status').textContent).toBe('실행 항목이 4건 생깁니다'),
    );
  });
});

describe('CaseList 목록에서 고친 값', () => {
  const 값있는케이스: CaseRow = {
    ...케이스('ZPK-001'),
    paramSchema: {
      type: 'object',
      properties: { currency: { type: 'string', description: '통화', default: 'KRW' } },
    } as unknown as CaseRow['paramSchema'],
  };
  const 한쪽: Paged<CaseRow> = { items: [값있는케이스], total: 1, page: 1, pageSize: 2 };

  async function 값을고치고() {
    모킹(() => Promise.resolve(한쪽));
    const 것 = render(<CaseList service="ZPK" />);
    await screen.findByText('ZPK-001 케이스');
    fireEvent.change(screen.getByLabelText(/통화/), { target: { value: 'USD' } });
    return 것;
  }

  it('고친 값이 줄에 남는다', async () => {
    await 값을고치고();
    expect((screen.getByLabelText(/통화/) as HTMLInputElement).value).toBe('USD');
  });

  it('고친 값이 모달에 그대로 떠 있다', async () => {
    await 값을고치고();

    fireEvent.click(실행버튼());
    const 모달 = await screen.findByRole('dialog');

    const 칸 = within(모달).getByLabelText(/통화/) as HTMLInputElement;
    expect(칸.value).toBe('USD');
  });

  it('고친 값이 실행 요청의 params 로 나간다', async () => {
    const 걸기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 9 });
    await 값을고치고();

    fireEvent.click(실행버튼());
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(모달실행());

    await waitFor(() => expect(걸기).toHaveBeenCalledTimes(1));
    // 모달에 떠 있는 것까지가 아니라 **요청에 실렸는지**를 본다.
    // 이 한 홉이 끊기면 사람은 고친 값으로 돈 줄 알고 기본값 결과를 증적으로 제출한다
    expect(걸기.mock.calls[0]![0].items[0]!.params).toEqual({ currency: 'USD' });
  });

  it('서비스를 바꾸면 고친 값을 버린다', async () => {
    const { rerender } = await 값을고치고();

    rerender(<CaseList service="ZQQ" />);
    await waitFor(() => {
      expect((screen.getByLabelText(/통화/) as HTMLInputElement).value).toBe('KRW');
    });
  });
});

describe('CaseList 화면 머리 (2026-09-22)', () => {
  it('제목이 h1 이고 주 행동이 그 줄에 선다 — 본문 안이 아니다', async () => {
    const { container } = await 그리기();

    const 머리 = container.querySelector('.head');
    expect(머리).not.toBeNull();
    // 자리 이름(`테스트 케이스`)과 화면 제목(`테스트케이스 목록`)은 다른 말을 한다 (SPEC §8, 2026-09-22).
    // 같으면 한 화면이 같은 말을 두 번 한다
    expect(머리?.querySelector('h1')?.textContent).toBe('테스트케이스 목록');
    // 「다시 스캔」과 실행 버튼은 이 화면에서 가장 흔한 다음 행동이라 머리에 선다
    expect(머리?.textContent).toContain('다시 스캔');
    expect(머리?.textContent).toContain('실행');
  });

  it('머리가 본문 면 바깥에 선다', async () => {
    const { container } = await 그리기();

    // .screen 안에 넣으면 제목이 카드 안으로 들어가 머리와 본문이 다시 붙는다
    expect(container.querySelector('.screen .head')).toBeNull();
  });
});
