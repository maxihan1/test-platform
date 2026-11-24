// @vitest-environment jsdom
// 케이스 목록 · 상세의 테스트 프로시저 — 헤더 줄 · 판정 점과 글자 · Blocked · 프로시저 단위 선택과 실행 (도메인/카탈로그 §8.1 「테스트 프로시저」 · DESIGN.md 「테스트 목록」 「케이스 상세」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CasePage, type CaseRow, type LastResult, type ServiceRow, type User } from './api.js';
import { CaseList } from './CaseList.js';
import { 프로시저로묶기 } from './CaseListProc.js';
import type { 판정 } from './role.js';
import { 지켜본다 } from './runWatchStore.js';

afterEach(() => {
  cleanup();
  지켜본다(null);
  vi.restoreAllMocks();
});

beforeEach(() => {
  window.location.hash = '#/cases';
});

function 케이스(tcId: string, 프로시저?: [seq: number, count: number], 더: Partial<CaseRow> = {}): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['android'],
    precondition: [],
    filePath: 'tests/zpp/ZPP-TP-001.spec.ts',
    paramSchema: {},
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-11-24T00:00:00.000Z',
    procId: 프로시저 === undefined ? null : 'ZPP-TP-001',
    procName: 프로시저 === undefined ? null : '글쓰기 흐름',
    procSeq: 프로시저?.[0] ?? null,
    procCount: 프로시저?.[1] ?? null,
    ...더,
  };
}

const 다섯 = [1, 2, 3, 4, 5].map((n) => 케이스(`ZPP-FN-10${String(n)}`, [n, 5]));
const 옛꼴 = 케이스('ZPP-FN-001');

function 결과(tcId: string, status: LastResult['status'], 더: Partial<LastResult> = {}): LastResult {
  return { tcId, platform: 'android', status, historyId: Number(tcId.slice(-3)), runId: 7, durationMs: 1000, finishedAt: '2026-11-24T01:00:00.000Z', recent: [status], ...더 };
}

// 3번째가 실패해 4번째가 막혔고, 5번째는 막은 케이스 번호 없이 Blocked 다(kit 의 드문 길)
const 마지막 = [
  결과('ZPP-FN-101', 'PASS'),
  결과('ZPP-FN-102', 'PASS'),
  결과('ZPP-FN-103', 'FAIL'),
  결과('ZPP-FN-104', 'NA', { blockedBy: 'ZPP-FN-103', blocked: true }),
  결과('ZPP-FN-105', 'NA', { blockedBy: null, blocked: true }),
];

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZPP',
  name: '앱',
  color: '#123456', projectId: 1, projectName: '데모',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
  kind: 'APP',
};
const 사람: User = { username: 'zpp', displayName: '검사', role: 'member', dashboard: 'read', mustChangePassword: false, services: [서비스] };

async function 그리기(줄들: CaseRow[] = [...다섯, 옛꼴], 할수: 판정 = () => true) {
  const 쪽: CasePage = { items: 줄들, total: 줄들.length, page: 1, pageSize: 50 };
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: 마지막 });
  vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'caseHistory').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  vi.spyOn(api, 'item').mockRejectedValue(new Error('안 부른다'));
  const cases = vi.spyOn(api, 'cases').mockResolvedValue(쪽);
  const 것 = render(<CaseList kind="FN" service="ZPP" 할수={할수} 결과보나 앱종류="APP" />);
  await screen.findByText(줄들[0]!.tcId);
  // 마지막 결과가 따로 온다 — 결과가 있는 줄이 있으면 판정이 그려질 때까지 기다린다
  if (줄들.some((r) => 마지막.some((m) => m.tcId === r.tcId))) await waitFor(() => expect(것.container.querySelector('.vd, .verdict')).not.toBeNull());
  return { ...것, cases };
}

const 헤더 = (c: HTMLElement) => c.querySelector<HTMLElement>('.proc-head')!;

describe('프로시저로묶기', () => {
  it('이웃한 같은 프로시저의 케이스를 한 묶음으로, 그 밖의 케이스는 한 건씩 낸다', () => {
    const 묶음 = 프로시저로묶기([옛꼴, ...다섯, 케이스('ZPP-FN-002')]);

    expect(묶음.map((m) => [m.procId, m.rows.length])).toEqual([
      [null, 1],
      ['ZPP-TP-001', 5],
      [null, 1],
    ]);
  });

  it('비활성 케이스는 프로시저 묶음에 넣지 않는다 — 내려간 케이스는 지금 그 프로시저의 케이스가 아니다', () => {
    const 묶음 = 프로시저로묶기([다섯[0]!, 케이스('ZPP-FN-102', [2, 5], { isActive: false, procCount: null }), 다섯[2]!]);

    expect(묶음.map((m) => [m.procId, m.rows.map((r) => r.tcId)])).toEqual([
      ['ZPP-TP-001', ['ZPP-FN-101']],
      [null, ['ZPP-FN-102']],
      ['ZPP-TP-001', ['ZPP-FN-103']],
    ]);
  });
});

describe('케이스 목록의 프로시저 헤더 줄', () => {
  it('번호 · 이름 · 건수 · Fail 수 · Blocked 수를 적고 케이스마다 판정 점을 실행 차례대로 놓는다', async () => {
    const { container } = await 그리기();
    const 머리 = within(헤더(container));

    expect(머리.getByText('ZPP-TP-001')).toBeTruthy();
    expect(머리.getByText('글쓰기 흐름')).toBeTruthy();
    expect(머리.getByText('5건')).toBeTruthy();
    expect(머리.getByText('Fail 1')).toBeTruthy();
    expect(머리.getByText('Blocked 2')).toBeTruthy();
    expect([...헤더(container).querySelectorAll('.flow-dots i')].map((i) => i.className)).toEqual(['fd-pass', 'fd-pass', 'fd-fail', 'fd-blocked', 'fd-blocked']);
    // 점은 장식이다 — 읽어 주는 이름은 옆 글자가 맡는다
    expect(헤더(container).querySelector('.flow-dots')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('조건에 걸려 프로시저의 일부만 보이면 「5건 중 2건」으로 적고 점도 보이는 줄만큼만 찍는다', async () => {
    const { container } = await 그리기([다섯[2]!, 다섯[3]!]);

    expect(within(헤더(container)).getByText('5건 중 2건')).toBeTruthy();
    expect(헤더(container).querySelectorAll('.flow-dots i')).toHaveLength(2);
  });

  it('실행 기록이 없는 케이스는 점선 원이다', async () => {
    const { container } = await 그리기([다섯[0]!, 케이스('ZPP-FN-109', [2, 2])]);

    expect([...헤더(container).querySelectorAll('.flow-dots i')].map((i) => i.className)).toEqual(['fd-pass', 'fd-none']);
  });

  it('헤더 체크박스가 그 프로시저의 케이스를 다 선택하고 다시 누르면 푼다. 일부만 선택됐으면 가운데 줄이다', async () => {
    await 그리기();
    const 칸 = () => screen.getByRole('checkbox', { name: 'ZPP-TP-001 글쓰기 흐름 케이스 5건 선택' }) as HTMLInputElement;

    fireEvent.click(칸());
    expect(within(screen.getByRole('toolbar', { name: '선택한 케이스' })).getByText('5건 선택')).toBeTruthy();
    expect(칸().checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'ZPP-FN-001 ZPP-FN-001 케이스 선택' }) as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByRole('checkbox', { name: 'ZPP-FN-102 ZPP-FN-102 케이스 선택' }));
    expect(칸().checked).toBe(false);
    expect(칸().indeterminate).toBe(true);

    // 일부만 선택된 채 누르면 나머지를 채운다
    fireEvent.click(칸());
    expect(칸().checked).toBe(true);
    fireEvent.click(칸());
    expect(screen.queryByRole('toolbar', { name: '선택한 케이스' })).toBeNull();
  });

  it('「실행」을 누르면 그 프로시저의 케이스를 담은 실행 창이 열린다', async () => {
    await 그리기();

    fireEvent.click(screen.getByRole('button', { name: 'ZPP-TP-001 실행' }));

    const 창 = within(await screen.findByRole('dialog', { name: '케이스 5건 실행' }));
    expect(창.getByText('ZPP-FN-101 케이스')).toBeTruthy();
    expect(창.getByText('ZPP-FN-105 케이스')).toBeTruthy();
    expect(창.queryByText('ZPP-FN-001 케이스')).toBeNull();
  });

  it('실행 읽기면 헤더에 「실행」이 없다', async () => {
    await 그리기(undefined, (무엇) => 무엇 !== '실행' && 무엇 !== '테스트실행');

    expect(screen.queryByRole('button', { name: /ZPP-TP-001 (시험 )?실행/ })).toBeNull();
  });
});

describe('케이스 목록의 줄 — 판정과 프로시저 안 케이스', () => {
  it('프로시저 안 케이스 줄은 번호 앞에 실행 차례가 서고 ▶ 가 없다. 프로시저에 안 든 케이스는 차례 없이 ▶ 가 선다', async () => {
    const { container } = await 그리기();
    const 줄 = (tcId: string) => container.querySelector(`#case-open-${tcId}`)!.closest('.row')!;

    expect(줄('ZPP-FN-103').querySelector('.proc-seq')?.textContent).toBe('3');
    expect(줄('ZPP-FN-103').querySelector('.proc-seq')?.getAttribute('title')).toBe('5건 중 3번째');
    expect(screen.queryByRole('button', { name: /^ZPP-FN-10\d .*실행$/ })).toBeNull();
    expect(줄('ZPP-FN-001').querySelector('.proc-seq')).toBeNull();
    expect(screen.getByRole('button', { name: 'ZPP-FN-001 Android 앱 실행' })).toBeTruthy();
  });

  it('Pass 는 점과 글자 · Fail 만 채운 배지 · Blocked 는 막은 케이스 번호가 없어도 Blocked 다', async () => {
    const { container } = await 그리기();
    const 판정 = (tcId: string) => container.querySelector(`#case-open-${tcId}`)!.closest('.row')!.querySelector('.device-line')!.firstElementChild!;

    expect(판정('ZPP-FN-101').querySelector('.vd.vd-pass')?.textContent).toBe('Pass');
    expect(판정('ZPP-FN-103').querySelector('.verdict.v-fail')?.textContent).toBe('Fail');
    expect(판정('ZPP-FN-104').querySelector('.vd.vd-blocked')?.textContent).toBe('Blocked');
    expect(판정('ZPP-FN-105').querySelector('.vd.vd-blocked')?.textContent).toBe('Blocked');
    expect(판정('ZPP-FN-001').textContent).toBe('실행 기록 없음');
  });

  it('줄 왼쪽 띠는 Fail 줄에만 선다', async () => {
    const { container } = await 그리기();
    const 띠 = (tcId: string) => container.querySelector(`#case-open-${tcId}`)!.closest('.row')!.querySelector<HTMLElement>('.gutter')!.style.background;

    expect(띠('ZPP-FN-103')).toBe('var(--fail)');
    expect(띠('ZPP-FN-101')).toBe('');
    expect(띠('ZPP-FN-104')).toBe('');
    expect(띠('ZPP-FN-001')).toBe('');
  });

  it('디바이스가 하나인 종류는 결과 칸을 한 칸으로 좁힌다 — 웹은 두 칸 그대로다', async () => {
    const { container, unmount } = await 그리기();
    expect(container.querySelector('.case-rows')?.classList.contains('dev-1')).toBe(true);
    unmount();

    render(<CaseList kind="FN" service="ZPP" 할수={() => true} 결과보나 앱종류="SCREEN" />);
    await screen.findByText('ZPP-FN-101');
    expect(document.querySelector('.case-rows')?.classList.contains('dev-1')).toBe(false);
  });
});

describe('케이스 상세의 「테스트 프로시저」 구획', () => {
  async function 연다(tcId: string, 할수: 판정 = () => true) {
    // 서랍은 케이스 하나만 찾아 열릴 때가 많다 — 목록에는 그 한 건뿐이고 같은 프로시저의 케이스는 서랍이 따로 받는다
    const 한건 = 다섯.find((c) => c.tcId === tcId)!;
    const 것 = await 그리기([한건], 할수);
    것.cases.mockImplementation((q) =>
      Promise.resolve({ items: q.q === 'ZPP-TP-001' ? 다섯 : [한건], total: 5, page: 1, pageSize: 50 }),
    );
    fireEvent.click(screen.getByRole('button', { name: `${tcId} 케이스` }));
    const 칸 = within(await screen.findByRole('complementary').catch(() => document.querySelector<HTMLElement>('#case-pane')!));
    await waitFor(() => expect(document.querySelectorAll('.case-proc-list li')).toHaveLength(5));
    return { ...것, 칸 };
  }

  it('프로시저 번호 · 이름 · 「5건 중 4번째」와 같은 프로시저의 케이스를 실행 차례대로 보이고 지금 케이스를 표시한다', async () => {
    const { cases } = await 연다('ZPP-FN-104');
    const 구획 = document.querySelector<HTMLElement>('.case-proc')!;

    expect(cases).toHaveBeenCalledWith({ service: 'ZPP', q: 'ZPP-TP-001', page: 1 });
    expect(within(구획).getByText('테스트 프로시저')).toBeTruthy();
    expect(within(구획).getByText('5건 중 4번째')).toBeTruthy();
    expect([...구획.querySelectorAll('.case-proc-list .id')].map((x) => x.textContent)).toEqual(['ZPP-FN-101', 'ZPP-FN-102', 'ZPP-FN-103', 'ZPP-FN-104', 'ZPP-FN-105']);
    expect(구획.querySelector('[aria-current="true"] .id')?.textContent).toBe('ZPP-FN-104');
    expect(구획.querySelector('li:nth-child(3) .verdict.v-fail')?.textContent).toBe('Fail');
    expect(within(구획).getByText('단독으로 실행할 수 없습니다. 프로시저 단위로 실행합니다')).toBeTruthy();
  });

  it('마지막 결과가 Blocked 면 절차 위에 사유 한 줄이 선다', async () => {
    await 연다('ZPP-FN-104');

    expect(document.querySelector('.case-blocked')?.textContent).toBe('Blocked 선행 케이스 ZPP-FN-103 실패');
  });

  // 막은 케이스(103)의 마지막 결과만 바꿔 본다 — 끝나면 되돌린다
  async function 막은결과로(바꾼: LastResult, 기대: string) {
    const 원래 = 마지막[2]!;
    마지막[2] = 바꾼;
    try {
      await 연다('ZPP-FN-104');
      expect(document.querySelector('.case-blocked')?.textContent).toBe(기대);
    } finally {
      마지막[2] = 원래;
    }
  }

  it('막은 케이스가 같은 실행에서 판정 없이 끝났으면 「제한 시간 초과」로 적는다', async () => {
    await 막은결과로(결과('ZPP-FN-103', 'NA'), 'Blocked 선행 케이스 ZPP-FN-103 제한 시간 초과');
  });

  it('막은 케이스가 그 뒤에 다시 돌아 마지막 결과가 다른 실행 것이면 까닭 없이 번호까지만 적는다', async () => {
    await 막은결과로(결과('ZPP-FN-103', 'PASS', { runId: 8 }), 'Blocked 선행 케이스 ZPP-FN-103');
  });

  it('막은 케이스 번호가 없는 Blocked 는 글자만 선다', async () => {
    await 연다('ZPP-FN-105');

    expect(document.querySelector('.case-blocked')?.textContent?.trim()).toBe('Blocked');
  });

  it('단추는 「프로시저 실행」이고 누르면 그 프로시저의 케이스를 담은 실행 창이 열린다', async () => {
    await 연다('ZPP-FN-104');

    expect(screen.queryByRole('button', { name: '실행' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '프로시저 실행' }));

    const 창 = within(await screen.findByRole('dialog', { name: '케이스 5건 실행' }));
    expect(창.getByText('ZPP-FN-101 케이스')).toBeTruthy();
  });

  it('그 번호를 이름에 적은 다른 케이스가 많아 첫 쪽에 다 안 들면 다음 쪽까지 받는다', async () => {
    const 한건 = 다섯[3]!;
    const { cases } = await 그리기([한건]);
    const 남 = Array.from({ length: 2 }, (_, n) => 케이스(`ZPP-FN-90${String(n)}`));
    cases.mockImplementation((q) =>
      Promise.resolve(q.q !== 'ZPP-TP-001' ? { items: [한건], total: 1, page: 1, pageSize: 50 } : { items: q.page === 1 ? [...남, 다섯[0]!, 다섯[1]!] : 다섯.slice(2), total: 7, page: q.page ?? 1, pageSize: 4 }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'ZPP-FN-104 케이스' }));

    await waitFor(() => expect(document.querySelectorAll('.case-proc-list li')).toHaveLength(5));
    expect(cases).toHaveBeenCalledWith({ service: 'ZPP', q: 'ZPP-TP-001', page: 2 });
  });

  it('같은 프로시저의 케이스를 못 받았으면 그 사실을 적고 단추는 이 케이스 한 건으로 실행 창을 연다 — 서버가 프로시저를 펼친다', async () => {
    const 한건 = 다섯[3]!;
    const { cases } = await 그리기([한건]);
    cases.mockImplementation((q) => (q.q === 'ZPP-TP-001' ? Promise.reject(new Error('끊김')) : Promise.resolve({ items: [한건], total: 1, page: 1, pageSize: 50 })));
    fireEvent.click(screen.getByRole('button', { name: 'ZPP-FN-104 케이스' }));

    expect(await screen.findByText('같은 프로시저의 케이스를 불러오지 못했습니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '프로시저 실행' }));
    expect(within(await screen.findByRole('dialog', { name: '케이스 1건 실행' })).getByText('ZPP-FN-104 케이스')).toBeTruthy();
  });

  it('실행 칸이 테스트만이면 단추가 「프로시저 시험 실행」이다', async () => {
    await 연다('ZPP-FN-104', (무엇) => 무엇 !== '실행');

    expect(screen.getByRole('button', { name: '프로시저 시험 실행' })).toBeTruthy();
  });

  it('프로시저에 안 든 케이스는 구획이 없고 단추는 「실행」 그대로다', async () => {
    const { cases } = await 그리기([옛꼴]);
    fireEvent.click(screen.getByRole('button', { name: 'ZPP-FN-001 케이스' }));
    await waitFor(() => expect(document.querySelector('#case-pane')).not.toBeNull());

    expect(document.querySelector('.case-proc')).toBeNull();
    expect(screen.getByRole('button', { name: '실행' })).toBeTruthy();
    // 목록이 부른 한 번뿐이다 — 같은 프로시저의 케이스를 받으러 가지 않는다
    expect(cases).toHaveBeenCalledTimes(1);
  });
});
