// @vitest-environment jsdom
// 케이스 목록의 「여러 건 고르기」 검사 (SPEC §8.1).
//
// 가장 비싼 축은 ③ 「전체」다. 서버가 한 쪽씩만 주므로 화면이 손에 든 쪽만 담으면
// 51건째부터 조용히 빠지는데 버튼은 「전체」라고 말한다. 그래서 여기서는
// `api.cases` 가 **쪽마다 불렸는지**를 본다 — 한 쪽만 받고 끝나면 실패해야 한다.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, ApiError, type CasePage, type CaseQuery, type CaseRow, type Platform, type ServiceRow, type User } from './api.js';
import { CaseList } from './CaseList.js';
import { 언어함 } from './i18n.js';
import type { 판정 } from './role.js';

const 전부된다: 판정 = () => true;

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
const 칸수 = { total: 3, pass: 1, fail: 1, na: 1 };
const 쪽1: CasePage = { items: [케이스('ZPK-001'), 케이스('ZPK-002')], total: 3, page: 1, pageSize: 2, lastCounts: 칸수 };
// 디바이스 수가 다른 케이스를 섞는다. items 를 곱으로 세면 여기서 어긋난다
const 쪽2: CasePage = { items: [케이스('ZPK-003', ['desktop', 'mobile'])], total: 3, page: 2, pageSize: 2, lastCounts: 칸수 };

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZPK',
  name: '결제',
  color: '#123456',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 사람: User = { username: 'zpk', displayName: '검사', role: 'member', dashboard: 'read', mustChangePassword: false, services: [서비스] };

/** 마운트에서 부르는 셋과 대상 서버를 읽는 통로를 막는다. cases 만 시험 대상이다 */
function 모킹(cases: (page: number) => Promise<CasePage>) {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
  vi.spyOn(api, 'caseHistory').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  return vi.spyOn(api, 'cases').mockImplementation((q) => cases(q.page ?? 1));
}

const 쪽주기 = (page: number) => Promise.resolve(page === 1 ? 쪽1 : 쪽2);

async function 그리기(cases: (page: number) => Promise<CasePage> = 쪽주기) {
  const 스파이 = 모킹(cases);
  const 것 = render(<CaseList kind="FN" service="ZPK" 할수={전부된다} 결과보나 />);
  await screen.findByText('ZPK-001');
  return { ...것, 스파이 };
}

describe('CaseList 종류 (화면공통 §8 하위 메뉴 · PR #132)', () => {
  it('고른 종류로 부르고 부제 맨 앞에 종류를 적는다', async () => {
    const 스파이 = 모킹(쪽주기);
    const { container } = render(<CaseList kind="UI" service="ZPK" 할수={전부된다} 결과보나 />);
    await screen.findByText('ZPK-001');
    expect(스파이).toHaveBeenCalledWith(expect.objectContaining({ service: 'ZPK', kind: 'UI' }));
    expect(container.querySelector('.head')?.textContent).toMatch(/UI 테스트 · /);
  });
});

const 고르기칸 = () => screen.getAllByRole('checkbox', { name: /고르기$/ });
const 머리칸 = () => screen.getByRole('checkbox', { name: '이 쪽 전체 선택' }) as HTMLInputElement;
const 실행버튼 = () => screen.getByRole('button', { name: /(전체|건) 실행$/ });
// 모달의 버튼은 글자가 딱 '실행'이다. 목록 쪽은 앞에 '전체'·'선택한 N건'이 붙는다
const 모달실행 = () => screen.getByRole('button', { name: '실행' });

const 전체실행글 = '조건에 맞는 3건 실행';
const 결과칩 = (글: string) => screen.getByRole('button', { name: new RegExp(`^${글} \\d+$`) });
const 끝질의 = (스파이: { mock: { calls: [CaseQuery][] } }) => 스파이.mock.calls.at(-1)![0];

// 집계 띠(판정 넷 숫자)는 없어졌다 — 같은 수를 마지막 결과 칩이 단다. 수는 쪽이 아니라 서버가 센 조건에 맞는 전부다 (⑫ 시안 A)
describe('CaseList 마지막 결과 칩', () => {
  it('집계 띠는 없고 칩마다 서버가 센 건수가 붙는다', async () => {
    await 그리기();

    expect(document.querySelector('.stats')).toBeNull();
    expect(결과칩('전체').textContent).toBe('전체 3');
    expect(결과칩('통과').textContent).toBe('통과 1');
    expect(결과칩('실패').textContent).toBe('실패 1');
    expect(결과칩('미실행').textContent).toBe('미실행 1');
  });

  it('건수는 이 쪽의 줄 수가 아니라 응답의 lastCounts 다', async () => {
    await 그리기(() => Promise.resolve({ ...쪽1, lastCounts: { total: 120, pass: 100, fail: 7, na: 13 } }));

    expect(결과칩('전체').textContent).toBe('전체 120');
    expect(결과칩('실패').textContent).toBe('실패 7');
  });

  it('실패가 있을 때만 실패 칩에 경고 색 표시가 붙는다', async () => {
    const { unmount } = await 그리기();
    expect(결과칩('실패').classList.contains('chip-fail')).toBe(true);
    unmount();
    await 그리기(() => Promise.resolve({ ...쪽1, lastCounts: { total: 3, pass: 3, fail: 0, na: 0 } }));
    expect(결과칩('실패').classList.contains('chip-fail')).toBe(false);
  });

  it('lastCounts 가 null 이면(실행 읽기 권한 없음) 마지막 결과 칩 묶음을 안 그린다', async () => {
    await 그리기(() => Promise.resolve({ ...쪽1, lastCounts: null }));

    expect(screen.queryByRole('button', { name: /^(통과|실패|미실행) / })).toBeNull();
    expect(screen.queryByRole('group', { name: '마지막 결과' })).toBeNull();
    expect(document.querySelector('.toolbar .filter-label')?.textContent).not.toBe('마지막 결과');
  });

  it('칩을 누르면 api.cases 를 last 를 실어 첫 쪽부터 다시 부르고 주소에도 남는다', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(끝질의(스파이).page).toBe(2));

    fireEvent.click(결과칩('실패'));

    await waitFor(() => expect(끝질의(스파이)).toMatchObject({ last: 'FAIL', page: 1 }));
    expect(결과칩('실패').getAttribute('aria-pressed')).toBe('true');
    expect(window.location.hash).toContain('last=FAIL');
  });

  it('전체 칩으로 돌리면 질의에 last 를 안 싣는다', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.click(결과칩('통과'));
    await waitFor(() => expect(끝질의(스파이).last).toBe('PASS'));

    fireEvent.click(결과칩('전체'));

    await waitFor(() => expect(끝질의(스파이)).not.toHaveProperty('last'));
  });

  it('받은 줄을 화면이 다시 거르지 않는다 — 서버가 거른 대로 그린다', async () => {
    await 그리기();

    fireEvent.click(결과칩('실패'));

    await waitFor(() => expect(결과칩('실패').getAttribute('aria-pressed')).toBe('true'));
    expect(screen.getByText('ZPK-001')).toBeTruthy();
    expect(screen.getByText('ZPK-002')).toBeTruthy();
    expect(screen.queryByText(/이 쪽에는 .* 케이스가 없습니다/)).toBeNull();
  });

  it('칩을 걸고 조건 초기화를 누르면 last 가 빠진다', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.click(결과칩('미실행'));
    await waitFor(() => expect(끝질의(스파이).last).toBe('NA'));

    fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }));

    await waitFor(() => expect(끝질의(스파이)).not.toHaveProperty('last'));
  });
});

// 목록 폭으로 줄을 쌓는 규칙(styles.css `.case-rows`)은 케이스 목록 상자에만 걸린다 — 실행 기록 · 작성 목록은 안 바뀐다 (PR #159)
describe('CaseList 스크롤 칸', () => {
  it('줄이 든 스크롤 칸에 케이스 목록 표시가 있다', async () => {
    await 그리기();
    const 칸 = document.querySelector('.rows-scroll');
    expect(칸?.classList.contains('case-rows')).toBe(true);
    expect(칸?.querySelector('.row.pickable')).not.toBeNull();
  });
});

// 창 794px 중 564px 을 위아래 UI 가 먼저 가져가 표에 206px(1.5줄)만 남았다 (2026-09-22 실측).
// 스캔 줄 49px 과 필터 둘째 줄 66px 이 그 안에 있다
describe('미확정 케이스 (도메인/카탈로그 §8.1)', () => {
  const 미확정쪽 = {
    items: [{ ...케이스('ZPK-001'), unconfirmed: '확인 필요 — ZPK-REQ-003' }, 케이스('ZPK-002')],
    total: 2,
    page: 1,
    pageSize: 2,
    unconfirmed: { count: 7 },
  };

  it('머리에 미확정 건수만 적고 나이 글은 없다', async () => {
    const { container } = await 그리기(() => Promise.resolve(미확정쪽));
    const 머리 = container.querySelector('.head')?.textContent ?? '';
    expect(머리).toContain('미확정 7건');
    expect(머리).not.toContain('가장 오래된');
    expect(머리).not.toContain('일째');
  });

  it('미확정 케이스 줄에만 배지가 붙는다', async () => {
    const { container } = await 그리기(() => Promise.resolve(미확정쪽));
    const 배지 = [...container.querySelectorAll('.case-tag')];
    expect(배지).toHaveLength(1);
    expect(배지[0]?.closest('.row')?.textContent).toContain('ZPK-001');
  });

  it('미확정이 없으면 머리에 적지 않는다', async () => {
    const { container } = await 그리기();
    expect(container.querySelector('.head')?.textContent).not.toContain('미확정');
  });
});

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
    vi.spyOn(api, 'caseHistory').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    vi.spyOn(api, 'cases').mockImplementation((q) => 쪽주기(q.page ?? 1));
    if (오류 === null) {
      vi.spyOn(api, 'lastScan').mockResolvedValue(값 as never);
    } else {
      vi.spyOn(api, 'lastScan').mockRejectedValue(오류);
    }
    render(<CaseList kind="FN" service="ZPK" 할수={전부된다} 결과보나 />);
    await screen.findByText('ZPK-001');
  }

  it('스캔 결과는 지금 보는 서비스 것만 받는다 (PRD-F9-19)', async () => {
    await 스캔그리기(스캔);
    expect(api.lastScan).toHaveBeenCalledWith('ZPK');
  });

  it('스캔 결과가 화면 머리 안에 있고 따로 줄을 만들지 않는다', async () => {
    await 스캔그리기(스캔);
    await waitFor(() => {
      expect(document.querySelector('.head')?.textContent ?? '').toMatch(/마지막 스캔/);
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

  it('머리의 체크박스가 이 쪽 케이스를 한 번에 고르고 다시 누르면 푼다', async () => {
    await 그리기();
    fireEvent.click(머리칸());
    expect(고르기칸().every((칸) => (칸 as HTMLInputElement).checked)).toBe(true);
    expect(실행버튼().textContent).toBe('선택한 2건 실행');

    fireEvent.click(머리칸());
    expect(고르기칸().some((칸) => (칸 as HTMLInputElement).checked)).toBe(false);
    expect(실행버튼().textContent).toBe(전체실행글);
  });

  it('일부만 골랐으면 머리 체크박스가 일부 선택 상태이고 누르면 나머지까지 고른다', async () => {
    await 그리기();
    fireEvent.click(고르기칸()[0]!);
    expect(머리칸().indeterminate).toBe(true);
    expect(머리칸().checked).toBe(false);

    fireEvent.click(머리칸());
    expect(고르기칸().every((칸) => (칸 as HTMLInputElement).checked)).toBe(true);
    expect(머리칸().indeterminate).toBe(false);
  });

  it('아무것도 안 고르면 버튼 글자가 「조건에 맞는 N건 실행」이고 N 은 응답의 total 이다', async () => {
    await 그리기();
    expect(실행버튼().textContent).toBe(전체실행글);
  });

  it('조건을 걸면 N 이 그 조건에 맞는 total 로 바뀐다 — 「전체」라고 말하지 않는다', async () => {
    await 그리기((page) => Promise.resolve(page === 1 ? { ...쪽1, total: 7 } : 쪽2));
    expect(실행버튼().textContent).toBe('조건에 맞는 7건 실행');
  });

  it('고른 수만큼 버튼 글자가 바뀐다', async () => {
    await 그리기();
    fireEvent.click(고르기칸()[0]!);
    expect(실행버튼().textContent).toBe('선택한 1건 실행');
    fireEvent.click(고르기칸()[1]!);
    expect(실행버튼().textContent).toBe('선택한 2건 실행');
  });

  it('조건에 맞는 건 실행을 누르면 마지막 쪽까지 쪽마다 받아 모은다', async () => {
    const { 스파이 } = await 그리기();
    스파이.mockClear();

    fireEvent.click(실행버튼());

    await waitFor(() => {
      const 받은쪽 = 스파이.mock.calls.map(([q]) => q.page);
      expect(받은쪽).toEqual([1, 2]);
    });
  });

  it('마지막 결과 칩을 걸고 누르면 모으는 쪽마다 같은 last 조건이 실린다', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.click(결과칩('실패'));
    await waitFor(() => expect(끝질의(스파이).last).toBe('FAIL'));
    스파이.mockClear();

    fireEvent.click(실행버튼());

    await screen.findByRole('dialog');
    expect(스파이.mock.calls.map(([q]) => q.last)).toEqual(['FAIL', 'FAIL']);
  });

  it('받는 동안 버튼이 막히고 그 사실이 화면 줄로 뜬다', async () => {
    let 풀기: ((쪽: CasePage) => void) | null = null;
    // 두 번째 쪽을 손에 쥐고 있어야 「받는 중」 이 화면에 떠 있는 순간을 붙잡을 수 있다
    await 그리기((page) =>
      page === 1
        ? Promise.resolve(쪽1)
        : new Promise<CasePage>((resolve) => {
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

    // 칩은 「무엇을 볼까」이지 「무엇을 돌릴까」가 아니다. 서버가 거른 새 목록이 와도 고른 것은 줄 통째로 들고 있다
    fireEvent.click(결과칩('실패'));
    expect(실행버튼().textContent).toBe('선택한 2건 실행');
    fireEvent.click(실행버튼());

    const 모달 = await screen.findByRole('dialog');
    expect(모달.getAttribute('aria-label')).toBe('실행할 케이스 2건');
  });

  it('서비스를 바꾸면 고른 것도 버린다', async () => {
    const { rerender } = await 그리기();
    fireEvent.click(고르기칸()[0]!);
    expect(실행버튼().textContent).toBe('선택한 1건 실행');

    rerender(<CaseList kind="FN" service="ZPY" 할수={전부된다} 결과보나 />);

    // 남겨 두면 다른 서비스에서 「고른 1건」이라 말하고 누르면 사실이 아닌 이유를 보여준다
    await waitFor(() => expect(실행버튼().textContent).toBe(전체실행글));
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
    render(<CaseList kind="FN" service="ZPK" 할수={전부된다} 결과보나 />);
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
    // 제목은 서버가 짓는다 — 화면은 싣지 않는다 (도메인/실행 §7 「자동 제목」)
    expect(본문).not.toHaveProperty('title');
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

    const 거는중 = await screen.findByRole('button', { name: '실행을 시작하는 중' });
    expect(거는중.hasAttribute('disabled')).toBe(true);
    // 말풍선이 아니라 버튼 글자다 (DESIGN.md 접근성 기준)
    expect(거는중.hasAttribute('title')).toBe(false);

    await waitFor(() => expect(풀기).not.toBeNull());
    풀기!({ runId: 11 });

    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?run=11'));
  });

  it('성공하면 그 실행 결과 화면으로 간다', async () => {
    vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 7 });
    await 모달까지();

    fireEvent.click(모달실행());

    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?run=7'));
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

    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?run=9'));
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

const 값있는케이스: CaseRow = {
  ...케이스('ZPK-001'),
  paramSchema: {
    type: 'object',
    properties: { currency: { type: 'string', description: '통화', default: 'KRW' } },
  } as unknown as CaseRow['paramSchema'],
};
const 한쪽: CasePage = { items: [값있는케이스], total: 1, page: 1, pageSize: 2, lastCounts: 칸수 };
const 이름버튼 = () => screen.getByRole('button', { name: 'ZPK-001 케이스' });

describe('CaseList 상세 칸에서 고친 값', () => {
  async function 값을고치고() {
    모킹(() => Promise.resolve(한쪽));
    const 것 = render(<CaseList kind="FN" service="ZPK" 할수={전부된다} 결과보나 />);
    await screen.findByText('ZPK-001');
    fireEvent.click(이름버튼());
    fireEvent.change(await screen.findByLabelText(/통화/), { target: { value: 'USD' } });
    return 것;
  }

  it('줄에는 입력 칸이 없고 이름을 눌러야 상세 칸에 입력 칸이 뜬다', async () => {
    모킹(() => Promise.resolve(한쪽));
    render(<CaseList kind="FN" service="ZPK" 할수={전부된다} 결과보나 />);
    await screen.findByText('ZPK-001');
    expect(screen.queryByLabelText(/통화/)).toBeNull();

    fireEvent.click(이름버튼());

    expect((await screen.findByLabelText(/통화/) as HTMLInputElement).value).toBe('KRW');
  });

  it('고친 값은 칸을 닫았다 다시 열어도 남는다', async () => {
    await 값을고치고();

    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));
    expect(screen.queryByLabelText(/통화/)).toBeNull();
    fireEvent.click(이름버튼());

    expect(((await screen.findByLabelText(/통화/)) as HTMLInputElement).value).toBe('USD');
  });

  it('고친 값이 목록 머리의 실행 창에 그대로 떠 있다', async () => {
    await 값을고치고();

    fireEvent.click(실행버튼());
    const 모달 = await screen.findByRole('dialog');

    const 칸 = within(모달).getByLabelText(/통화/) as HTMLInputElement;
    expect(칸.value).toBe('USD');
  });

  it('칸의 「이 값으로 실행」은 고친 값을 실은 실행 창을 연다', async () => {
    await 값을고치고();

    fireEvent.click(screen.getByRole('button', { name: '이 값으로 실행' }));
    const 모달 = await screen.findByRole('dialog');

    expect((within(모달).getByLabelText(/통화/) as HTMLInputElement).value).toBe('USD');
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

  it('서비스를 바꾸면 칸이 닫히고 고친 값도 버린다', async () => {
    const { rerender } = await 값을고치고();

    rerender(<CaseList kind="FN" service="ZQQ" 할수={전부된다} 결과보나 />);

    await waitFor(() => expect(document.getElementById('case-pane')).toBeNull());
    fireEvent.click(await screen.findByRole('button', { name: 'ZPK-001 케이스' }));
    expect(((await screen.findByLabelText(/통화/)) as HTMLInputElement).value).toBe('KRW');
  });
});

describe('CaseList 오른쪽 상세 칸 (⑫ 시안 A · 점검 7.12)', () => {
  const 칸 = () => document.getElementById('case-pane');

  it('이름을 누르면 오른쪽 칸이 열리고 주소에 case= 가 남는다', async () => {
    await 그리기();

    fireEvent.click(screen.getByRole('button', { name: 'ZPK-001 케이스' }));

    expect(칸()?.tagName).toBe('ASIDE');
    expect(within(칸()!).getByRole('heading', { name: 'ZPK-001 케이스' })).toBeTruthy();
    expect(window.location.hash).toContain('case=ZPK-001');
    expect(document.querySelector('.cases-split')?.classList.contains('has-pane')).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'ZPK-001 케이스' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'ZPK-002 케이스' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('한 번에 한 건만 열린다 — 다른 이름을 누르면 칸이 그 케이스로 바뀐다', async () => {
    await 그리기();
    fireEvent.click(screen.getByRole('button', { name: 'ZPK-001 케이스' }));

    fireEvent.click(screen.getByRole('button', { name: 'ZPK-002 케이스' }));

    expect(document.querySelectorAll('#case-pane')).toHaveLength(1);
    expect(within(칸()!).getByRole('heading', { name: 'ZPK-002 케이스' })).toBeTruthy();
    expect(window.location.hash).toContain('case=ZPK-002');
    expect(window.location.hash).not.toContain('ZPK-001');
  });

  it('같은 이름을 다시 누르면 닫히고 주소에서 case= 가 빠진다', async () => {
    await 그리기();
    fireEvent.click(screen.getByRole('button', { name: 'ZPK-001 케이스' }));

    fireEvent.click(screen.getByRole('button', { name: 'ZPK-001 케이스' }));

    expect(칸()).toBeNull();
    expect(window.location.hash).not.toContain('case=');
    expect(document.querySelector('.cases-split')?.classList.contains('has-pane')).toBe(false);
  });

  it('✕ 로 닫으면 포커스가 그 이름 버튼으로 돌아온다', async () => {
    await 그리기();
    fireEvent.click(screen.getByRole('button', { name: 'ZPK-001 케이스' }));

    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));

    expect(칸()).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'ZPK-001 케이스' }));
  });

  it('칸을 열어도 목록 줄은 그대로 있고 고른 것도 안 풀린다', async () => {
    await 그리기();
    fireEvent.click(고르기칸()[0]!);

    fireEvent.click(screen.getByRole('button', { name: 'ZPK-002 케이스' }));

    expect(screen.getByText('ZPK-001')).toBeTruthy();
    expect(실행버튼().textContent).toBe('선택한 1건 실행');
  });

  it('이 쪽에 없는 케이스가 열려 있으면 칸을 안 그리지만 주소는 남겨 돌아오면 다시 열린다', async () => {
    window.location.hash = '#/cases/fn?case=ZPK-003';
    모킹(쪽주기);
    render(<CaseList kind="FN" service="ZPK" 할수={전부된다} 결과보나 />);
    await screen.findByText('ZPK-001');

    expect(칸()).toBeNull();
    expect(window.location.hash).toContain('case=ZPK-003');

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('button', { name: 'ZPK-003 케이스' });
    expect(within(칸()!).getByRole('heading', { name: 'ZPK-003 케이스' })).toBeTruthy();
  });

  it('실행 쓰기가 없으면 칸에 실행 단추가 없고, 작성 쓰기가 없으면 코드 기본값 요청도 없다', async () => {
    const 실행빼고: 판정 = (무엇) => 무엇 !== '실행' && 무엇 !== '작성요청';
    모킹(() => Promise.resolve(한쪽));
    render(<CaseList kind="FN" service="ZPK" 할수={실행빼고} 결과보나 />);
    await screen.findByText('ZPK-001');

    fireEvent.click(이름버튼());
    await screen.findByLabelText(/통화/);

    expect(screen.queryByRole('button', { name: '이 값으로 실행' })).toBeNull();
    expect(screen.queryByText('코드 기본값 바꾸기 요청')).toBeNull();
  });

  it('칸 안의 실행 이력은 케이스마다 한 번만 받는다 — 닫았다 열어도 다시 안 받는다', async () => {
    await 그리기();
    const 이력 = vi.mocked(api.caseHistory);
    fireEvent.click(screen.getByRole('button', { name: 'ZPK-001 케이스' }));
    await waitFor(() => expect(이력).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));
    fireEvent.click(screen.getByRole('button', { name: 'ZPK-001 케이스' }));
    await screen.findByText('아직 기록이 없습니다');

    expect(이력).toHaveBeenCalledTimes(1);
  });
});

describe('CaseList 화면 머리 (2026-09-22)', () => {
  it('제목이 h1 이고 주 행동이 그 줄에 선다 — 본문 안이 아니다', async () => {
    const { container } = await 그리기();

    const 머리 = container.querySelector('.head');
    expect(머리).not.toBeNull();
    // 자리 이름(`테스트 스크립트`)과 화면 제목(`테스트 스크립트 목록`)은 다른 말을 한다 (SPEC §8, 2026-09-22).
    // 같으면 한 화면이 같은 말을 두 번 한다
    expect(머리?.querySelector('h1')?.textContent).toBe('테스트 스크립트 목록');
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

// 등급이 낮아서 못 하는 것은 흐리게가 아니라 아예 안 보인다 (화면공통 §8)
describe('CaseList 권한 칸', () => {
  const 스캔빼고: 판정 = (무엇) => 무엇 !== '다시스캔';
  const 실행빼고: 판정 = (무엇) => 무엇 !== '실행';

  it('케이스 읽기면 머리에 다시 스캔이 없다', async () => {
    모킹(쪽주기);
    render(<CaseList kind="FN" service="ZPK" 할수={스캔빼고} 결과보나 />);
    await screen.findByText('ZPK-001');
    expect(screen.queryByRole('button', { name: '다시 스캔' })).toBeNull();
  });

  it('케이스 읽기면 빈 목록에도 스캔 버튼이 없다', async () => {
    모킹(() => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 2 }));
    render(<CaseList kind="FN" service="ZPK" 할수={스캔빼고} 결과보나 />);
    await screen.findByText('아직 케이스를 불러오지 않았습니다');
    expect(screen.queryByRole('button', { name: '케이스 불러오기' })).toBeNull();
  });

  it('실행 읽기면 전체 실행도 선택 실행도 없다', async () => {
    모킹(쪽주기);
    render(<CaseList kind="FN" service="ZPK" 할수={실행빼고} 결과보나 />);
    await screen.findByText('ZPK-001');
    expect(screen.queryByRole('button', { name: /(전체|건) 실행$/ })).toBeNull();
    fireEvent.click(고르기칸()[0]!);
    expect(screen.queryByRole('button', { name: /(전체|건) 실행$/ })).toBeNull();
  });

  it('실행 읽기면 줄마다의 실행 버튼도 없다', async () => {
    모킹(쪽주기);
    render(<CaseList kind="FN" service="ZPK" 할수={실행빼고} 결과보나 />);
    await screen.findByText('ZPK-001');
    expect(screen.queryByRole('button', { name: 'ZPK-001 실행' })).toBeNull();
  });

  it('실행 칸이 none 이면 마지막 결과를 부르지 않는다 — 부르면 403 이다', async () => {
    모킹(쪽주기);
    const 결과 = vi.mocked(api.lastByCase);
    render(<CaseList kind="FN" service="ZPK" 할수={실행빼고} 결과보나={false} />);
    expect(await screen.findByText('ZPK-001')).toBeTruthy();
    expect(결과).not.toHaveBeenCalled();
  });
});

describe('CaseList 상세 칸에서 저장값 저장', () => {
  const 쪽 = (row: CaseRow): CasePage => ({ items: [row], total: 1, page: 1, pageSize: 2, lastCounts: 칸수 });

  it('다시 읽기가 도착할 때까지 고친 값을 그대로 두고, 도착하면 저장값이 칸을 채운다', async () => {
    let 도착: (page: CasePage) => void = () => undefined;
    const 다시읽기 = new Promise<CasePage>((resolve) => {
      도착 = resolve;
    });
    let 부른수 = 0;
    모킹(() => (++부른수 === 1 ? Promise.resolve(쪽(값있는케이스)) : 다시읽기));
    const 저장 = vi.spyOn(api, 'saveInput').mockResolvedValue(null);
    render(<CaseList kind="FN" service="ZPK" 할수={전부된다} 결과보나 />);
    await screen.findByText('ZPK-001 케이스');
    fireEvent.click(이름버튼());
    fireEvent.change(await screen.findByLabelText(/통화/), { target: { value: 'USD' } });
    expect(screen.getByText('팀 모두와 정기 실행에 쓰입니다')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '모두에게 저장' }));
    await waitFor(() => expect(저장).toHaveBeenCalledWith('ZPK-001', { params: { currency: 'USD' }, expected: {} }));
    await waitFor(() => expect(부른수).toBe(2));
    expect((screen.getByLabelText(/통화/) as HTMLInputElement).value).toBe('USD');

    도착(쪽({
      ...값있는케이스,
      savedInput: { params: { currency: 'USD' }, expected: {}, savedSecrets: { params: [], expected: [] }, savedBy: 'zpk', savedAt: '2026-09-29T00:00:00.000Z' },
    }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '모두에게 저장' })).toBeNull());
    expect((screen.getByLabelText(/통화/) as HTMLInputElement).value).toBe('USD');
  });

  it('케이스 쓰기가 없으면 고쳐도 「모두에게 저장」이 없다', async () => {
    const 쓰기빼고: 판정 = (무엇) => 무엇 !== '입력값저장';
    모킹(() => Promise.resolve(쪽(값있는케이스)));
    render(<CaseList kind="FN" service="ZPK" 할수={쓰기빼고} 결과보나 />);
    await screen.findByText('ZPK-001 케이스');
    fireEvent.click(이름버튼());

    fireEvent.change(await screen.findByLabelText(/통화/), { target: { value: 'USD' } });

    expect(screen.queryByRole('button', { name: '모두에게 저장' })).toBeNull();
  });
});

// 고르개는 질의에 **kit 원문 값**을 싣는다. 번역 글자가 실리면 영어 화면에서 서버가 400 을 낸다
describe('CaseList 설계 기법 (도메인/카탈로그 §8.1 「설계 기법」)', () => {
  const 고르개 = () => screen.getByRole('combobox', { name: '설계 기법' }) as HTMLSelectElement;
  const 마지막질의 = (스파이: ReturnType<typeof 모킹>) => 스파이.mock.calls.at(-1)?.[0];

  it('고르면 kit 원문 값으로 다시 부르고 첫 쪽으로 간다', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(마지막질의(스파이)?.page).toBe(2));

    fireEvent.change(고르개(), { target: { value: '경계값 분석' } });

    await waitFor(() => expect(마지막질의(스파이)).toEqual(expect.objectContaining({ technique: '경계값 분석', page: 1 })));
  });

  it('기법 없음은 none 으로 묻는다', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.change(고르개(), { target: { value: 'none' } });
    await waitFor(() => expect(마지막질의(스파이)?.technique).toBe('none'));
  });

  it('전체로 돌리면 질의에 기법을 안 싣는다', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.change(고르개(), { target: { value: '결정 테이블' } });
    await waitFor(() => expect(마지막질의(스파이)?.technique).toBe('결정 테이블'));

    fireEvent.change(고르개(), { target: { value: 'ALL' } });
    await waitFor(() => expect(마지막질의(스파이)).not.toHaveProperty('technique'));
  });

  it('고르면 고른 것은 그대로 둔다 — 디바이스 · 표시 칩과 같다', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.click(고르기칸()[0]!);
    expect(실행버튼().textContent).toBe('선택한 1건 실행');

    fireEvent.change(고르개(), { target: { value: '상태 전이' } });
    await waitFor(() => expect(마지막질의(스파이)?.technique).toBe('상태 전이'));
    expect(실행버튼().textContent).toBe('선택한 1건 실행');
  });

  it('조건 초기화가 기법도 비운다', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.change(고르개(), { target: { value: '동등 분할' } });
    await waitFor(() => expect(마지막질의(스파이)?.technique).toBe('동등 분할'));

    fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }));

    expect(고르개().value).toBe('ALL');
    await waitFor(() => expect(마지막질의(스파이)).not.toHaveProperty('technique'));
  });

  it('전체 실행도 고른 기법으로 모은다', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.change(고르개(), { target: { value: '경계값 분석' } });
    await waitFor(() => expect(마지막질의(스파이)?.technique).toBe('경계값 분석'));
    await screen.findByText('ZPK-001');
    스파이.mockClear();

    fireEvent.click(실행버튼());

    await screen.findByRole('dialog');
    expect(스파이.mock.calls.map(([q]) => q.technique)).toEqual(['경계값 분석', '경계값 분석']);
  });

  it('영어 화면에서 골라도 질의는 한국어 원문이다', async () => {
    const 스파이 = 모킹(쪽주기);
    render(
      <언어함 value="en">
        <CaseList kind="FN" service="ZPK" 할수={전부된다} 결과보나 />
      </언어함>,
    );
    await screen.findByText('ZPK-001');

    const 옵션 = screen.getByRole('option', { name: 'Boundary value analysis' }) as HTMLOptionElement;
    fireEvent.change(screen.getByRole('combobox', { name: 'Design technique' }), { target: { value: 옵션.value } });

    await waitFor(() => expect(마지막질의(스파이)?.technique).toBe('경계값 분석'));
  });

  it('UI 테스트 목록에는 고르개가 없다', async () => {
    모킹(쪽주기);
    render(<CaseList kind="UI" service="ZPK" 할수={전부된다} 결과보나 />);
    await screen.findByText('ZPK-001');
    expect(screen.queryByRole('combobox', { name: '설계 기법' })).toBeNull();
  });
});
