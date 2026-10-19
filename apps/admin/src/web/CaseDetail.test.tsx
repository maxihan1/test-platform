// @vitest-environment jsdom
// 케이스 상세 칸 검사 (SPEC §8.1 「상세 칸」, 2026-10-19 ⑫ 시안 A — 모달에서 목록 오른쪽 칸으로).
//
// §8.1 은 「케이스마다 이력을 따로 부르지 않는다」를 못 박는다. 상세는 그 규칙의 예외인데,
// 예외인 이유는 **목록이 부르는 것이 아니라 사람이 한 줄을 열었을 때 부르기 때문**이다.
// 받은 것은 `기억` 에 담아 다시 받지 않는다 — 칸을 닫았다 열어도 같은 기억이면 부르지 않아야 한다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CaseRow, type HistoryRow, type LastResult, type RunItemPage } from './api.js';
import { CaseDetail } from './CaseDetail.js';
import { 빈기억 } from './caseDetailView.js';
import { keyOf, type LastMap } from './catalogView.js';

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

const 값없는케이스: CaseRow = { ...케이스, paramSchema: {} as CaseRow['paramSchema'], expectedSchema: {} as CaseRow['expectedSchema'] };
const 두기기케이스: CaseRow = { ...케이스, platforms: ['desktop', 'mobile'] };

const 결과 = (platform: LastResult['platform'], status: LastResult['status'], historyId: number, runId: number): LastResult => ({
  tcId: 'ZZD-001',
  platform,
  status,
  historyId,
  runId,
  durationMs: 1,
  finishedAt: '2026-09-21T00:00:02.000Z',
  recent: [status],
});

const 한기기마지막: LastMap = { [keyOf('ZZD-001', 'desktop')]: 결과('desktop', 'PASS', 5, 2) };
const 두기기마지막: LastMap = {
  [keyOf('ZZD-001', 'desktop')]: 결과('desktop', 'PASS', 5, 2),
  [keyOf('ZZD-001', 'mobile')]: 결과('mobile', 'FAIL', 6, 3),
};

const 이력줄 = (historyId: number, runId: number, status: HistoryRow['status']): HistoryRow => ({
  historyId,
  runId,
  runTitle: `ZZD-001 실행 ${runId}`,
  platform: 'desktop',
  status,
  durationMs: 1200,
  startedAt: '2026-09-21T00:00:00.000Z',
  finishedAt: '2026-09-21T00:00:02.000Z',
});

const 이력 = { items: [이력줄(5, 2, 'PASS')], total: 1, page: 1, pageSize: 20 };

const 단계들 = (...줄: [number, string, 'PASS' | 'FAIL', string?][]): RunItemPage['steps'] =>
  줄.map(([seq, title, status, screenshotPath]) => ({
    seq,
    title,
    status,
    durationMs: 1,
    assertions: [],
    ...(screenshotPath === undefined ? {} : { screenshotPath }),
  })) as unknown as RunItemPage['steps'];

const 항목 = (over: Partial<RunItemPage>): RunItemPage =>
  ({
    trace: null,
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
    steps: 단계들([1, '결제 화면을 연다', 'PASS']),
    ...over,
  }) as unknown as RunItemPage;

function 통로를막는다() {
  const 이력스파이 = vi.spyOn(api, 'caseHistory').mockResolvedValue(이력);
  const 항목스파이 = vi.spyOn(api, 'item').mockResolvedValue(항목({}));
  return { 이력스파이, 항목스파이 };
}

function 그린다(over: Partial<React.ComponentProps<typeof CaseDetail>> = {}) {
  return render(
    <CaseDetail row={케이스} 마지막={{}} 기억={빈기억()} onClose={() => {}} on값={() => {}} on저장됨={() => {}} {...over} />,
  );
}

describe('케이스 상세의 설계 기법 (도메인/카탈로그 §8.1 「설계 기법」)', () => {
  it('기법이 있으면 구획에 태그로 그린다', () => {
    통로를막는다();
    const { container } = 그린다({ row: { ...케이스, techniques: ['경계값 분석', '상태 전이'] } });

    const 구획 = [...container.querySelectorAll('.dsec')].find((el) => el.querySelector('.dlabel')?.textContent === '설계 기법');
    expect([...(구획?.querySelectorAll('.tech-tag') ?? [])].map((el) => el.textContent)).toEqual(['경계값 분석', '상태 전이']);
  });

  it('기법이 없으면 구획을 안 그린다', () => {
    통로를막는다();
    const { container } = 그린다({ row: { ...케이스, techniques: [] } });

    expect(screen.queryByText('설계 기법')).toBeNull();
    expect(container.querySelector('.tech-tag')).toBeNull();
  });
});

describe('케이스 상세 칸 — 모달이 아니라 목록 옆 칸이다', () => {
  it('상자가 아니라 aside 로 그리고 케이스 이름을 제목으로 단다', () => {
    통로를막는다();
    그린다();

    expect(screen.queryByRole('dialog')).toBeNull();
    const 칸 = document.getElementById('case-pane');
    expect(칸?.tagName).toBe('ASIDE');
    expect(within(칸!).getByRole('heading', { name: '상세 케이스' })).toBeTruthy();
    expect(within(칸!).getByText('ZZD-001')).toBeTruthy();
  });

  it('✕ 상세 닫기 를 누르면 onClose 를 부른다', () => {
    통로를막는다();
    const onClose = vi.fn();
    그린다({ onClose });

    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('손에 이미 있는 것(사전조건 · 입력값 · 기대결과)부터 그린다 — 부르기를 기다리지 않는다', () => {
    통로를막는다();

    그린다();

    expect(screen.getByText('로그인한 상태다')).toBeTruthy();
    expect(screen.getByText('카드번호')).toBeTruthy();
    expect(screen.getByText('주문 상태')).toBeTruthy();
  });
});

describe('이력 · 절차를 한 번만 받는다', () => {
  it('열면 이력을 한 번 부르고, 같은 기억으로 다시 그려도 또 부르지 않는다', async () => {
    const { 이력스파이 } = 통로를막는다();
    const 기억 = 빈기억();

    const { unmount } = 그린다({ 기억 });
    await waitFor(() => expect(screen.getByText(/ZZD-001 실행 2/)).toBeTruthy());
    expect(이력스파이).toHaveBeenCalledTimes(1);

    unmount();
    그린다({ 기억 });

    expect(screen.getByText(/ZZD-001 실행 2/)).toBeTruthy();
    expect(이력스파이).toHaveBeenCalledTimes(1);
  });

  it('돌린 적이 없으면 절차를 부르지 않고 그 사실을 적는다', async () => {
    const { 항목스파이 } = 통로를막는다();

    그린다();

    await waitFor(() => expect(screen.getByText(/아직 돌린 적이 없습니다/)).toBeTruthy());
    expect(항목스파이).not.toHaveBeenCalled();
  });

  it('돌린 적이 있으면 마지막 결과의 절차를 받아 그리고 꼬리글에 RUN 번호를 단다', async () => {
    const { 항목스파이 } = 통로를막는다();

    그린다({ 마지막: 한기기마지막 });

    await waitFor(() => expect(screen.getByText('결제 화면을 연다')).toBeTruthy());
    expect(항목스파이).toHaveBeenCalledWith(2, 5);
    expect(screen.getByText(/RUN 2 · /)).toBeTruthy();
  });

  it('절차를 못 받아 와도 이력은 그대로 그린다', async () => {
    vi.spyOn(api, 'caseHistory').mockResolvedValue(이력);
    vi.spyOn(api, 'item').mockRejectedValue(new Error('러너가 없다'));

    그린다({ 마지막: 한기기마지막 });

    await waitFor(() => expect(screen.getByText(/ZZD-001 실행 2/)).toBeTruthy());
    expect(screen.getByText(/절차를 불러오지 못했습니다/)).toBeTruthy();
  });
});

describe('디바이스 칩으로 절차를 고른다 (점검 7.7)', () => {
  function 두기기를막는다() {
    vi.spyOn(api, 'caseHistory').mockResolvedValue(이력);
    return vi.spyOn(api, 'item').mockImplementation(async (_runId, historyId) =>
      historyId === 6
        ? 항목({ historyId: 6, runId: 3, platform: 'mobile', status: 'FAIL', steps: 단계들([1, '모바일 결제를 연다', 'PASS']) })
        : 항목({ steps: 단계들([1, 'PC 결제를 연다', 'PASS']) }),
    );
  }

  it('실패한 디바이스가 먼저 열린다 — PC 가 앞이어도 모바일 절차를 보인다', async () => {
    const 항목스파이 = 두기기를막는다();

    그린다({ row: 두기기케이스, 마지막: 두기기마지막 });

    await waitFor(() => expect(screen.getByText('모바일 결제를 연다')).toBeTruthy());
    expect(항목스파이).toHaveBeenCalledWith(3, 6);
    expect(screen.queryByText('PC 결제를 연다')).toBeNull();
    expect(screen.getByRole('button', { name: 'PC 통과' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: '모바일 실패' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('칩을 누르면 그 디바이스 절차를 불러 바꿔 보인다', async () => {
    const 항목스파이 = 두기기를막는다();
    그린다({ row: 두기기케이스, 마지막: 두기기마지막 });
    await waitFor(() => expect(screen.getByText('모바일 결제를 연다')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'PC 통과' }));

    await waitFor(() => expect(screen.getByText('PC 결제를 연다')).toBeTruthy());
    expect(항목스파이).toHaveBeenCalledWith(2, 5);
    expect(screen.queryByText('모바일 결제를 연다')).toBeNull();
    expect(screen.getByRole('button', { name: 'PC 통과' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('돈 디바이스가 하나면 칩을 안 그린다', async () => {
    통로를막는다();

    그린다({ row: 두기기케이스, 마지막: 한기기마지막 });

    await waitFor(() => expect(screen.getByText('결제 화면을 연다')).toBeTruthy());
    expect(screen.queryByRole('group', { name: '디바이스' })).toBeNull();
  });
});

describe('실패한 단계 아래에 사유와 실패 화면을 단다 (점검 7.9)', () => {
  const 실패항목 = (screenshotPath?: string) =>
    항목({
      status: 'FAIL',
      failure: { type: 'mismatch', reason: '결제 금액이 달랐다' },
      steps: 단계들([1, '결제 화면을 연다', 'PASS'], [2, '금액을 확인한다', 'FAIL', screenshotPath]),
    });

  it('FAIL 단계에만 실패 사유와 「실패 화면 보기」 고리를 단다', async () => {
    vi.spyOn(api, 'caseHistory').mockResolvedValue(이력);
    vi.spyOn(api, 'item').mockResolvedValue(실패항목('shots/2.png'));

    const { container } = 그린다({ 마지막: { [keyOf('ZZD-001', 'desktop')]: 결과('desktop', 'FAIL', 5, 2) } });

    await waitFor(() => expect(screen.getByText('결제 금액이 달랐다')).toBeTruthy());
    const 링크 = screen.getByRole('link', { name: '실패 화면 보기' });
    expect(링크.getAttribute('href')).toBe('/api/screenshots/2/5/2.png');
    expect(container.querySelectorAll('.dstep-why')).toHaveLength(1);
    const 실패줄 = container.querySelector('.dstep-fail');
    expect(실패줄?.textContent).toContain('금액을 확인한다');
    expect(실패줄?.textContent).toContain('결제 금액이 달랐다');
  });

  it('스크린샷이 없으면 사유만 있고 고리는 없다', async () => {
    vi.spyOn(api, 'caseHistory').mockResolvedValue(이력);
    vi.spyOn(api, 'item').mockResolvedValue(실패항목());

    그린다({ 마지막: { [keyOf('ZZD-001', 'desktop')]: 결과('desktop', 'FAIL', 5, 2) } });

    await waitFor(() => expect(screen.getByText('결제 금액이 달랐다')).toBeTruthy());
    expect(screen.queryByRole('link', { name: '실패 화면 보기' })).toBeNull();
  });

  it('통과한 절차에는 사유 자리가 없다', async () => {
    통로를막는다();

    const { container } = 그린다({ 마지막: 한기기마지막 });

    await waitFor(() => expect(screen.getByText('결제 화면을 연다')).toBeTruthy());
    expect(container.querySelector('.dstep-why')).toBeNull();
  });
});

describe('미확정 사유는 맨 위에 적는다 (점검 7.4)', () => {
  it('unconfirmed 가 글이면 「미확정」과 사유를 보인다', () => {
    통로를막는다();

    const { container } = 그린다({ row: { ...케이스, unconfirmed: '확인 필요 — MKT-REQ-003' } });

    const 줄 = container.querySelector('.case-unconfirmed');
    expect(줄?.textContent).toContain('미확정');
    expect(줄?.textContent).toContain('확인 필요 — MKT-REQ-003');
  });

  it('확정 케이스(null · 없음)에는 안 그린다', () => {
    통로를막는다();

    const { container } = 그린다({ row: { ...케이스, unconfirmed: null } });

    expect(container.querySelector('.case-unconfirmed')).toBeNull();
  });
});

describe('실행 이력은 실행 하나에 한 줄이다 (점검 N7)', () => {
  it('같은 실행의 여러 회차는 「N번 · 실패 a · 통과 b」 한 줄로 묶고 머리에 실행 수를 단다', async () => {
    vi.spyOn(api, 'caseHistory').mockResolvedValue({
      items: [이력줄(9, 7, 'FAIL'), 이력줄(8, 7, 'PASS'), 이력줄(7, 7, 'PASS'), 이력줄(5, 2, 'PASS')],
      total: 4,
      page: 1,
      pageSize: 20,
    });
    vi.spyOn(api, 'item').mockResolvedValue(항목({}));

    const { container } = 그린다();

    await waitFor(() => expect(screen.getByText('ZZD-001 실행 7')).toBeTruthy());
    expect(container.querySelectorAll('.dhist tr')).toHaveLength(2);
    expect(screen.getByText('3번 · 실패 1 · 통과 2')).toBeTruthy();
    expect(screen.getByText('실행 2번')).toBeTruthy();
    expect(screen.getByText('ZZD-001 실행 7').getAttribute('href')).toBe('#/runs/7/items/9');
  });

  it('회차가 하나인 실행은 판정 글자로 보인다', async () => {
    통로를막는다();

    const { container } = 그린다();

    await waitFor(() => expect(screen.getByText('ZZD-001 실행 2')).toBeTruthy());
    expect(container.querySelector('.dhist .verdict')?.textContent).toBe('통과');
  });

  it('기록이 없으면 그 사실을 적는다', async () => {
    vi.spyOn(api, 'caseHistory').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

    그린다();

    await waitFor(() => expect(screen.getByText('아직 기록이 없습니다')).toBeTruthy());
  });
});

describe('입력값을 칸 안에서 바로 고친다 (SPEC §8.1)', () => {
  it('입력값·기대결과가 읽기전용 표가 아니라 입력 칸으로 뜬다', () => {
    통로를막는다();

    그린다();

    const 입력칸 = screen.getByLabelText('카드번호') as HTMLInputElement;
    expect(입력칸.tagName).toBe('INPUT');
    expect(입력칸.value).toBe('4000-0002');
  });

  it('값을 고치면 on값 을 (params/expected, key, value) 로 부른다', () => {
    통로를막는다();
    const on값 = vi.fn();
    그린다({ on값 });

    fireEvent.change(screen.getByLabelText('카드번호'), { target: { value: '5000-1111' } });

    expect(on값).toHaveBeenCalledWith('params', 'card', '5000-1111');
  });

  it('이미 고친 값(글자)이 있으면 그 값을 채워서 연다 — 기본값으로 되돌리지 않는다', () => {
    통로를막는다();

    그린다({ 글자: { params: { card: '9999-0000' }, expected: {} } });

    expect((screen.getByLabelText('카드번호') as HTMLInputElement).value).toBe('9999-0000');
  });

  it('값 칸이 없는 케이스는 입력값 구획을 안 그린다', () => {
    통로를막는다();

    그린다({ row: 값없는케이스 });

    expect(screen.queryByText('입력값')).toBeNull();
    expect(screen.queryByText('기대결과')).toBeNull();
  });
});

describe('값 저장 — 누르기 전에 누구에게 닿는지 적는다 (점검 7.6)', () => {
  const 고친글자 = { params: { card: '9999-0000' }, expected: {} };

  it('저장이 되는 사람이 값을 고치면 안내 글과 「모두에게 저장」이 뜬다', () => {
    통로를막는다();

    그린다({ 글자: 고친글자, 저장된다: true });

    expect(screen.getByText('팀 모두와 정기 실행이 이 값을 씁니다')).toBeTruthy();
    expect(screen.getByRole('button', { name: '모두에게 저장' })).toBeTruthy();
  });

  it('고친 칸이 없으면 단추가 없다', () => {
    통로를막는다();

    그린다({ 저장된다: true });

    expect(screen.queryByRole('button', { name: '모두에게 저장' })).toBeNull();
  });

  it('케이스 쓰기가 없으면 고쳐도 단추가 없다', () => {
    통로를막는다();

    그린다({ 글자: 고친글자, 저장된다: false });

    expect(screen.queryByRole('button', { name: '모두에게 저장' })).toBeNull();
  });

  it('누르면 api.saveInput 으로 칸 전체 값을 보내고 on저장됨 을 부른다', async () => {
    통로를막는다();
    const 저장 = vi.spyOn(api, 'saveInput').mockResolvedValue(undefined as never);
    const on저장됨 = vi.fn();
    그린다({ 글자: 고친글자, 저장된다: true, on저장됨 });

    fireEvent.click(screen.getByRole('button', { name: '모두에게 저장' }));

    await waitFor(() => expect(on저장됨).toHaveBeenCalledTimes(1));
    expect(저장).toHaveBeenCalledWith('ZZD-001', { params: { card: '9999-0000' }, expected: { state: '결제 완료' } });
  });
});

describe('실행 단추 — 고친 값을 실은 실행 창을 연다', () => {
  it('「이 값으로 실행」을 누르면 on실행(row) 를 부른다', () => {
    통로를막는다();
    const on실행 = vi.fn();
    그린다({ on실행 });

    fireEvent.click(screen.getByRole('button', { name: '이 값으로 실행' }));

    expect(on실행).toHaveBeenCalledWith(케이스);
  });

  it('값 칸이 없는 케이스는 글자가 「실행」이다', () => {
    통로를막는다();
    const on실행 = vi.fn();
    그린다({ row: 값없는케이스, on실행 });

    expect(screen.queryByRole('button', { name: '이 값으로 실행' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    expect(on실행).toHaveBeenCalledTimes(1);
  });

  it('실행 쓰기가 없으면(on실행 없음) 단추가 없다', () => {
    통로를막는다();

    그린다();

    expect(screen.queryByRole('button', { name: '이 값으로 실행' })).toBeNull();
  });

  it('꺼진 케이스는 단추가 없다', () => {
    통로를막는다();

    그린다({ row: { ...케이스, isActive: false }, on실행: vi.fn() });

    expect(screen.queryByRole('button', { name: '이 값으로 실행' })).toBeNull();
  });
});

describe('코드 기본값 바꾸기 요청은 접어 둔다 (점검 7.11)', () => {
  it('고칠서비스가 있으면 details 안에 접혀 있고 summary 를 눌러야 펼쳐진다', () => {
    통로를막는다();
    const { container } = 그린다({ 고칠서비스: 'svc' });

    const 접힘 = container.querySelector('details.case-edit-fold') as HTMLDetailsElement;
    expect(접힘).not.toBeNull();
    expect(접힘.open).toBe(false);
    expect(접힘.querySelector('summary')?.textContent).toBe('코드 기본값 바꾸기 요청');
  });

  it('고칠서비스가 없으면(작성 쓰기 없음) 자리를 안 둔다', () => {
    통로를막는다();
    const { container } = 그린다();

    expect(container.querySelector('details.case-edit-fold')).toBeNull();
  });

  it('꺼진 케이스는 서버가 늘 거절하므로 자리를 안 둔다', () => {
    통로를막는다();
    const { container } = 그린다({ row: { ...케이스, isActive: false }, 고칠서비스: 'svc' });

    expect(container.querySelector('details.case-edit-fold')).toBeNull();
  });
});

describe('요구 번호 — 덮는 요구 전부를 상세에서 본다', () => {
  const 요구들 = [
    { reqId: 'MKT-REQ-001', axis: '정상' as const, text: '주문한다' },
    { reqId: 'OLD-9', axis: '예외' as const, text: null },
  ];

  it('요구보나 가 참이면 PRD 에 있는 번호만 고리다', () => {
    통로를막는다();

    그린다({ row: { ...케이스, reqs: 요구들 }, 요구보나: true });

    expect(screen.getByRole('link', { name: 'MKT-REQ-001' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'OLD-9' })).toBeNull();
    expect(screen.getByText('PRD 에 없는 번호예요')).toBeTruthy();
  });

  it('요구보나 가 아니면 번호가 글자다', () => {
    통로를막는다();

    그린다({ row: { ...케이스, reqs: 요구들 }, 요구보나: false });

    expect(screen.queryByRole('link', { name: 'MKT-REQ-001' })).toBeNull();
    expect(screen.getByText('MKT-REQ-001')).toBeTruthy();
  });
});
