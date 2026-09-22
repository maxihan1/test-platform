// @vitest-environment jsdom
// 케이스 상세 상자 검사 (SPEC §8.1, 2026-09-21 ② · 2026-09-22 에 펼침에서 상자로).
//
// §8.1 은 「케이스마다 이력을 따로 부르지 않는다」를 못 박는다. 상세는 그 규칙의 예외인데,
// 예외인 이유는 **목록이 부르는 것이 아니라 사람이 한 줄을 폈을 때 부르기 때문**이다.
// 그래서 여기서는 「접혀 있는 동안 안 부른다」를 가장 먼저 본다 — 그게 무너지면 예외가 아니라 위반이다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type CaseRow, type RunItemDetail } from './api.js';
import { CaseDetail } from './CaseDetail.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 케이스: CaseRow = {
  tcId: 'ZZD-001',
  name: '상세 케이스',
  platforms: ['desktop'],
  precondition: ['로그인한 상태다', '장바구니에 상품이 하나 있다'],
  filePath: 'tests/ZZD-001.spec.ts',
  paramSchema: {
    type: 'object',
    properties: { card: { type: 'string', description: '카드번호', default: '4000-0002' } },
  } as unknown as CaseRow['paramSchema'],
  expectedSchema: {
    type: 'object',
    properties: { state: { type: 'string', description: '주문 상태', default: '결제 완료' } },
  } as unknown as CaseRow['expectedSchema'],
  isActive: true,
  scannedAt: '2026-09-21T00:00:00.000Z',
};

const 이력 = {
  items: [
    {
      historyId: 5,
      runId: 2,
      runTitle: 'ZZD-001 실행',
      platform: 'desktop' as const,
      status: 'PASS' as const,
      durationMs: 1200,
      startedAt: '2026-09-21T00:00:00.000Z',
      finishedAt: '2026-09-21T00:00:02.000Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

const 항목: RunItemDetail = {
  historyId: 5,
  runId: 2,
  tcId: 'ZZD-001',
  tcName: '상세 케이스',
  platform: 'desktop',
  status: 'PASS',
  durationMs: 1200,
  startedAt: '2026-09-21T00:00:00.000Z',
  finishedAt: '2026-09-21T00:00:02.000Z',
  precondition: [],
  params: {},
  expected: {},
  paramSchema: {},
  expectedSchema: {},
  filePath: 'tests/ZZD-001.spec.ts',
  errorMessage: null,
  steps: [{ seq: 1, title: '결제 화면을 연다', status: 'PASS', durationMs: 400, assertions: [], line: null, screenshotPath: null }],
} as unknown as RunItemDetail;

function 통로를막는다() {
  const 이력스파이 = vi.spyOn(api, 'caseHistory').mockResolvedValue(이력);
  const 항목스파이 = vi.spyOn(api, 'item').mockResolvedValue(항목);
  return { 이력스파이, 항목스파이 };
}

describe('케이스 상세 펼침', () => {
  it('접혀 있으면 아무것도 안 그리고 통로도 안 부른다', () => {
    const { 이력스파이, 항목스파이 } = 통로를막는다();

    const { container } = render(
      <CaseDetail row={케이스} 폈나={false} 마지막={undefined} onClose={() => {}} on값={() => {}} />,
    );

    expect(container.querySelector('.detail')).toBeNull();
    expect(이력스파이).not.toHaveBeenCalled();
    expect(항목스파이).not.toHaveBeenCalled();
  });

  it('펼치면 손에 이미 있는 것부터 그린다 — 부르기를 기다리지 않는다', () => {
    통로를막는다();

    render(<CaseDetail row={케이스} 폈나={true} 마지막={undefined} onClose={() => {}} on값={() => {}} />);

    expect(screen.getByText('로그인한 상태다')).toBeTruthy();
    expect(screen.getByText('카드번호')).toBeTruthy();
    expect(screen.getByText('주문 상태')).toBeTruthy();
  });

  it('펼치면 이력을 한 번 부르고, 접었다 다시 펴도 또 부르지 않는다', async () => {
    const { 이력스파이 } = 통로를막는다();

    const { rerender } = render(
      <CaseDetail row={케이스} 폈나={true} 마지막={undefined} onClose={() => {}} on값={() => {}} />,
    );
    await waitFor(() => expect(이력스파이).toHaveBeenCalledTimes(1));

    rerender(<CaseDetail row={케이스} 폈나={false} 마지막={undefined} onClose={() => {}} on값={() => {}} />);
    rerender(<CaseDetail row={케이스} 폈나={true} 마지막={undefined} onClose={() => {}} on값={() => {}} />);

    await waitFor(() => expect(screen.getByText(/ZZD-001 실행/)).toBeTruthy());
    expect(이력스파이).toHaveBeenCalledTimes(1);
  });

  it('돌린 적이 없으면 절차를 부르지 않고 그 사실을 적는다', async () => {
    const { 항목스파이 } = 통로를막는다();

    render(<CaseDetail row={케이스} 폈나={true} 마지막={undefined} onClose={() => {}} on값={() => {}} />);

    await waitFor(() => expect(screen.getByText(/아직 돌린 적이 없습니다/)).toBeTruthy());
    expect(항목스파이).not.toHaveBeenCalled();
  });

  it('절차를 못 받아 와도 이력은 그대로 그린다', async () => {
    vi.spyOn(api, 'caseHistory').mockResolvedValue(이력);
    vi.spyOn(api, 'item').mockRejectedValue(new Error('러너가 없다'));

    render(
      <CaseDetail
        row={케이스}
        폈나={true}
        마지막={{ tcId: 'ZZD-001', platform: 'desktop', status: 'PASS', historyId: 5, runId: 2, durationMs: 1, finishedAt: '2026-09-21T00:00:02.000Z', recent: ['PASS'] }}
        onClose={() => {}}
        on값={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByText(/ZZD-001 실행/)).toBeTruthy());
    expect(screen.getByText(/절차를 불러오지 못했습니다/)).toBeTruthy();
  });
});

// 「1개 더」를 눌러도 이 상자가 뜨는데, 읽기만 하던 표로는 넘친 입력값을 고칠 곳이 없었다.
// 줄과 같은 Form 을 쓰므로 값을 바로 넣을 수 있어야 한다 (2026-09-22 ②)
describe('입력값을 상자 안에서 바로 고친다 (SPEC §8.1, 2026-09-22)', () => {
  it('입력값·기대결과가 읽기전용 표가 아니라 입력 칸으로 뜬다', () => {
    통로를막는다();

    render(<CaseDetail row={케이스} 폈나={true} 마지막={undefined} onClose={() => {}} on값={() => {}} />);

    const 입력칸 = screen.getByLabelText('카드번호') as HTMLInputElement;
    expect(입력칸.tagName).toBe('INPUT');
    expect(입력칸.value).toBe('4000-0002');
  });

  it('값을 고치면 on값 을 (params/expected, key, value) 로 부른다', () => {
    통로를막는다();
    const on값 = vi.fn();

    render(<CaseDetail row={케이스} 폈나={true} 마지막={undefined} onClose={() => {}} on값={on값} />);

    fireEvent.change(screen.getByLabelText('카드번호'), { target: { value: '5000-1111' } });

    expect(on값).toHaveBeenCalledWith('params', 'card', '5000-1111');
  });

  it('줄에서 이미 고친 값이 있으면 그 값을 채워서 연다 — 기본값으로 되돌리지 않는다', () => {
    통로를막는다();

    render(
      <CaseDetail
        row={케이스}
        폈나={true}
        마지막={undefined}
        글자={{ params: { card: '9999-0000' }, expected: {} }}
        onClose={() => {}}
        on값={() => {}}
      />,
    );

    expect((screen.getByLabelText('카드번호') as HTMLInputElement).value).toBe('9999-0000');
  });
});

// 펼침을 그만둔 이유가 「열렸다는 느낌이 없다」였다. 상자가 뜨는 것과
// **닫으면 열기 전 자리로 돌아오는 것**을 같이 본다 — 앞엣것만 보면 사람이 갇힌 상태도 통과한다
describe('상세는 상자로 연다 (SPEC §8.1, 2026-09-22)', () => {
  it('폈으면 상자가 뜬다. 줄 아래로 늘어나지 않는다', async () => {
    vi.spyOn(api, 'caseHistory').mockResolvedValue(이력);
    render(<CaseDetail row={케이스} 폈나 마지막={undefined} onClose={() => {}} on값={() => {}} />);

    const 상자 = await screen.findByRole('dialog');
    expect(상자.getAttribute('aria-modal')).toBe('true');
    expect(상자.getAttribute('aria-label')).toContain('ZZD-001');
  });

  it('접혀 있으면 상자가 없다', () => {
    render(<CaseDetail row={케이스} 폈나={false} 마지막={undefined} onClose={() => {}} on값={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Esc 로 닫힌다. 닫는 길이 버튼 하나뿐이면 키보드로 쓰는 사람이 갇힌다', async () => {
    vi.spyOn(api, 'caseHistory').mockResolvedValue(이력);
    const 닫힘 = vi.fn();
    render(<CaseDetail row={케이스} 폈나 마지막={undefined} onClose={닫힘} on값={() => {}} />);

    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(닫힘).toHaveBeenCalled();
  });
});
