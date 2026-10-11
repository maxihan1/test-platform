// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api.js';
import { Prd } from './Prd.js';
import { 판, 로그인실패 } from './prd.fixture.js';
import type { PrdNow } from './prdApi.js';
import type { 판정 } from './role.js';
import { scenarioApi, type ScenarioRow } from './scenarioApi.js';

const { 지금, 확정, 워드, 반영 } = vi.hoisted(() => ({
  지금: vi.fn((_s: string): Promise<PrdNow> => Promise.reject(new Error('판을 정하지 않았다'))),
  확정: vi.fn((_s: string, _base: number, _ids: string[]) => Promise.resolve({ version: 13 })),
  워드: vi.fn((_s: string): Promise<{ 파일: Blob; 머리: string | null }> => Promise.reject(new Error('워드를 정하지 않았다'))),
  반영: vi.fn((_s: string) => Promise.resolve({ id: 6120 })),
}));

vi.mock('./prdApi.js', () => ({ prdApi: { now: 지금, confirm: 확정, wordExport: 워드, apply: 반영 } }));

const 쓰는사람: 판정 = () => true;
const 보는사람: 판정 = () => false;

beforeEach(() => {
  지금.mockReset();
  지금.mockResolvedValue(판());
  확정.mockClear();
  워드.mockReset();
  반영.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const 확인칸 = () => screen.getByRole('region', { name: /확인 필요 2건/ });

describe('PRD 관리 — 할 일 먼저', () => {
  it('판이 없으면 빈 화면과 첫 요구를 적는 길을 보인다', async () => {
    지금.mockResolvedValue(판({ version: 0, items: [], unapplied: { changed: [], added: [], removed: [] }, needsCheck: { count: 0, oldestSince: null } }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    expect(await screen.findByText('요구 더하기로 첫 요구를 적습니다')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '판 이력' })).toBeNull();
    expect(screen.queryByRole('button', { name: '워드로 내려받기' })).toBeNull();
  });

  it('머리에 판과 요구 수, 확인 필요는 오래 기다린 것부터 나이와 근거 자리를 단다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    expect(await screen.findByText('판 12 · 요구 4건')).toBeTruthy();
    expect(within(확인칸()).getByText(/가장 오래된 것 9일째/)).toBeTruthy();
    const 줄들 = within(확인칸()).getAllByRole('listitem');
    expect(줄들.map((줄) => within(줄).getByText(/^MKT-REQ/).textContent)).toEqual(['MKT-REQ-040', 'MKT-REQ-032']);
    expect(within(줄들[0]!).getByText('9일째')).toBeTruthy();
    expect(within(줄들[0]!).getByText('로그인 · 화면 · /login')).toBeTruthy();
  });

  it('고른 확인 필요만 지금 판 번호와 함께 한 번에 확정하고 판을 다시 읽는다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('판 12 · 요구 4건');
    const 버튼 = screen.getByRole('button', { name: '고른 0건 확정' }) as HTMLButtonElement;
    expect(버튼.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'MKT-REQ-040 고르기' }));
    fireEvent.click(screen.getByRole('button', { name: '고른 1건 확정' }));
    await vi.waitFor(() => expect(확정).toHaveBeenCalledWith('MKT', 12, ['MKT-REQ-040']));
    expect(await screen.findByText('판 13으로 저장했습니다')).toBeTruthy();
    await vi.waitFor(() => expect(지금).toHaveBeenCalledTimes(2));
  });

  it('모두 고르기는 확인 필요 전부를 고른다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('판 12 · 요구 4건');
    fireEvent.click(screen.getByRole('checkbox', { name: '모두 고르기' }));
    fireEvent.click(screen.getByRole('button', { name: '고른 2건 확정' }));
    await vi.waitFor(() => expect(확정).toHaveBeenCalledWith('MKT', 12, ['MKT-REQ-040', 'MKT-REQ-032']));
  });

  it('다른 사람이 먼저 저장했으면 까닭을 말하고 새 판을 다시 읽는다', async () => {
    확정.mockRejectedValueOnce(new ApiError(409, 'PRD_STALE', ''));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('판 12 · 요구 4건');
    fireEvent.click(screen.getByRole('checkbox', { name: 'MKT-REQ-032 고르기' }));
    fireEvent.click(screen.getByRole('button', { name: '고른 1건 확정' }));
    expect(await screen.findByText('다른 사람이 먼저 PRD 를 바꿨습니다. 새 판을 불러왔으니 확인하고 다시 합니다')).toBeTruthy();
    await vi.waitFor(() => expect(지금).toHaveBeenCalledTimes(2));
  });

  it('반영 안 됨은 종류와 번호를 보이고 지운 요구는 글 없이 적는다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = await screen.findByRole('region', { name: /반영 안 됨 2건/ });
    expect(within(칸).getByText('새 항목')).toBeTruthy();
    expect(within(칸).getByText('MKT-REQ-012')).toBeTruthy();
    expect(within(칸).getByText('지운 요구')).toBeTruthy();
  });

  it('반영 버튼을 누르면 작성 요청 하나를 세우고 그 요청으로 가는 링크를 띄운다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = await screen.findByRole('region', { name: /반영 안 됨 2건/ });
    fireEvent.click(within(칸).getByRole('button', { name: '바뀐 요구 2건 테스트에 반영' }));
    await vi.waitFor(() => expect(반영).toHaveBeenCalledWith('MKT'));
    expect(await within(칸).findByText('작성 요청 6120번을 만들었습니다')).toBeTruthy();
    expect(within(칸).getByRole('link', { name: '#6120 요청 보기' }).getAttribute('href')).toBe('#/authoring/6120');
    expect((within(칸).getByRole('button', { name: '바뀐 요구 2건 테스트에 반영' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('이미 열린 반영이 있으면 그 요청 번호로 가는 링크를 띄운다', async () => {
    반영.mockRejectedValueOnce(new ApiError(409, 'APPLY_OPEN', '6101'));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = await screen.findByRole('region', { name: /반영 안 됨 2건/ });
    fireEvent.click(within(칸).getByRole('button', { name: '바뀐 요구 2건 테스트에 반영' }));
    expect(await within(칸).findByText(/이미 열린 반영 요청이 있습니다/)).toBeTruthy();
    expect(within(칸).getByRole('link', { name: '#6101 요청 보기' }).getAttribute('href')).toBe('#/authoring/6101');
  });

  it('반영 안 됨 요구를 덮는 케이스를 쓰는 E2E 시나리오를 버튼 위에 번호 · 이름으로 보인다', async () => {
    const 시나리오: ScenarioRow = { id: 3, name: '회원가입 후 첫 주문', platform: 'desktop', version: 1, partCount: 2, isActive: true, needsCheck: false, runnable: true, lastRun: null };
    const 부름 = vi.spyOn(scenarioApi, 'list').mockResolvedValue({ items: [시나리오] });
    const 덮음 = (tcId: string) => ({ tcId, axis: '정상', techniques: [], platforms: ['desktop' as const] });
    지금.mockResolvedValue(판({ cases: { 'MKT-REQ-012': [덮음('MKT-031')], 'MKT-REQ-041': [덮음('MKT-040'), 덮음('MKT-031')], 'MKT-REQ-031': [덮음('MKT-010')] } }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = await screen.findByRole('region', { name: /반영 안 됨 2건/ });
    expect(await within(칸).findByText('이번 반영으로 바뀌거나 지워질 수 있는 케이스를 쓰는 E2E 시나리오 1개 — 병합한 뒤 시험 실행으로 확인하고 지운 케이스는 다른 케이스로 바꿉니다')).toBeTruthy();
    expect(부름).toHaveBeenCalledWith('MKT', ['MKT-031', 'MKT-040']);
    expect(within(칸).getByRole('link', { name: 'SC-3 회원가입 후 첫 주문' }).getAttribute('href')).toBe('#/scenarios/3');
  });

  it('반영 안 됨 요구를 덮는 케이스가 없으면 시나리오를 묻지 않고 알림도 없다', async () => {
    const 부름 = vi.fn();
    vi.stubGlobal('fetch', 부름);
    지금.mockResolvedValue(판({ cases: { 'MKT-REQ-031': [{ tcId: 'MKT-010', axis: '정상', techniques: [], platforms: ['desktop' as const] }] } }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = await screen.findByRole('region', { name: /반영 안 됨 2건/ });
    expect(within(칸).getByRole('button', { name: '바뀐 요구 2건 테스트에 반영' })).toBeTruthy();
    expect(부름).not.toHaveBeenCalled();
    expect(within(칸).queryByText(/E2E 시나리오/)).toBeNull();
  });

  it('시나리오 목록을 못 읽으면 알림 없이 버튼만 남고 삭제 경고 문장도 없다', async () => {
    const 부름 = vi.spyOn(scenarioApi, 'list').mockRejectedValue(new ApiError(403, 'FORBIDDEN', '권한이 없습니다'));
    지금.mockResolvedValue(판({ cases: { 'MKT-REQ-012': [{ tcId: 'MKT-031', axis: '정상', techniques: [], platforms: ['desktop' as const] }] } }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = await screen.findByRole('region', { name: /반영 안 됨 2건/ });
    await vi.waitFor(() => expect(부름).toHaveBeenCalledWith('MKT', ['MKT-031']));
    expect(within(칸).getByRole('button', { name: '바뀐 요구 2건 테스트에 반영' })).toBeTruthy();
    expect(within(칸).queryByText(/E2E 시나리오/)).toBeNull();
  });

  it('할 일이 없으면 두 칸 대신 한 줄', async () => {
    지금.mockResolvedValue(
      판({ items: [판().items[0]!], unapplied: { changed: [], added: [], removed: [] }, needsCheck: { count: 0, oldestSince: null } }),
    );
    render(<Prd service="MKT" 할수={쓰는사람} />);
    expect(await screen.findByText('확인할 요구도 테스트에 반영할 요구도 없습니다')).toBeTruthy();
  });

  it('찾은 화면이 있으면 할 일이 없어도 「PRD 에 없는 화면」 카드를 그린다', async () => {
    지금.mockResolvedValue(
      판({
        items: [판().items[0]!],
        unapplied: { changed: [], added: [], removed: [] },
        needsCheck: { count: 0, oldestSince: null },
        foundScreens: 5,
        uncoveredScreens: [
          { state: '로그인', url: '/cart', name: '장바구니' },
          { state: '로그아웃', url: '/event/:n', name: '' },
        ],
      }),
    );
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 카드 = await screen.findByRole('region', { name: 'PRD 에 없는 화면 2개' });
    expect(screen.queryByText('확인할 요구도 테스트에 반영할 요구도 없습니다')).toBeNull();
    expect(within(카드).getByText('찾은 화면 5개 중 · 아직 요구사항도 테스트도 없는 화면입니다')).toBeTruthy();
    const 줄들 = within(카드).getAllByRole('listitem');
    expect(줄들.map((줄) => 줄.textContent)).toEqual(['로그인/cart장바구니', '로그아웃/event/:n']);
    expect(within(카드).getByText('테스트 작성에서 기획서 없이 「실제 화면과 대조」로 보내면 이 화면만 작성합니다')).toBeTruthy();
    expect(within(카드).queryByRole('link')).toBeNull();
  });

  it('PRD 에 없는 화면이 0 이면 비었다고 적고, 열린 요청이 있으면 번호마다 고리를 단다', async () => {
    지금.mockResolvedValue(판({ foundScreens: 3, uncoveredScreens: [], screensOpen: [31, 34] }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 카드 = await screen.findByRole('region', { name: 'PRD 에 없는 화면 0개' });
    expect(within(카드).getByText('PRD 에 없는 화면이 없습니다')).toBeTruthy();
    expect(within(카드).getByText(/#31 요청이 이 화면들을 작성하는 중입니다/)).toBeTruthy();
    const 고리 = within(카드).getAllByRole('link');
    expect(고리.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['#31 요청 보기', '#/authoring/31'],
      ['#34 요청 보기', '#/authoring/34'],
    ]);
    expect(within(카드).queryByText(/기획서 없이/)).toBeNull();
  });

  it('찾은 화면이 0 이면 카드를 안 그린다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('판 12 · 요구 4건');
    expect(screen.queryByRole('region', { name: /PRD 에 없는 화면/ })).toBeNull();
  });

  it('작성 쓰기가 없으면 고르기 · 확정 · 더하기 · 고치기가 아예 없다', async () => {
    render(<Prd service="MKT" 할수={보는사람} />);
    await screen.findByText('판 12 · 요구 4건');
    expect(screen.queryAllByRole('checkbox')).toEqual([]);
    expect(screen.queryByRole('button', { name: /확정/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '요구 더하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: /테스트에 반영/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /회원가입/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-031/ }));
    expect(screen.getByText('설계 미리보기')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '고치기' })).toBeNull();
  });
});

describe('PRD 관리 — 전체 요구', () => {
  it('기능 묶음으로 접혀 있고 묶음 머리에 건수와 확인 필요 · 반영 안 됨을 단다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 로그인 = await screen.findByRole('button', { name: /로그인/ });
    expect(로그인.textContent).toContain('2건 · 확인 필요 1건 · 반영 안 됨 1건');
    expect(로그인.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: /MKT-REQ-041/ })).toBeNull();
    fireEvent.click(로그인);
    const 줄 = screen.getByRole('button', { name: /MKT-REQ-041/ });
    expect(줄.textContent).toContain('새 항목 · 반영 안 됨');
    expect(줄.textContent).toContain('사람이 고침');
  });

  it('줄을 펴면 근거와 판정 함수가 계산한 설계 미리보기를 보인다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-031/ }));
    expect(screen.getByText('「아이디: 영문 소문자·숫자 4~12자」')).toBeTruthy();
    expect(['3자', '4자', '12자', '13자'].every((값) => screen.getByText(값))).toBe(true);
    expect(screen.getByText('동등 분할')).toBeTruthy();
  });

  it('찾는 동안은 맞은 묶음을 다 펴고, 없으면 그렇게 말한다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = await screen.findByRole('textbox', { name: '요구 문장 · 번호 검색' });
    fireEvent.change(칸, { target: { value: '잠긴다' } });
    expect(screen.getByRole('button', { name: /MKT-REQ-041/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /회원가입/ })).toBeNull();
    fireEvent.change(칸, { target: { value: '없는 말' } });
    expect(screen.getByText('찾는 요구가 없습니다')).toBeTruthy();
  });

  it('펼친 확인 필요 줄에서 그 요구만 확정한다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-032/ }));
    fireEvent.click(screen.getByRole('button', { name: '이 요구만 확정' }));
    await vi.waitFor(() => expect(확정).toHaveBeenCalledWith('MKT', 12, ['MKT-REQ-032']));
  });

  it('케이스 목록의 요구 번호에서 오면 그 묶음과 줄을 편 채로 열고 그 줄에 초점을 둔다 (도메인/카탈로그 §8.1 「맥락」)', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} 여기="MKT-REQ-041" />);
    const 줄 = await screen.findByRole('button', { name: /MKT-REQ-041/ });
    expect(줄.getAttribute('aria-expanded')).toBe('true');
    expect(줄.closest('.prd-item')?.classList.contains('prd-here')).toBe(true);
    expect(document.activeElement).toBe(줄);
    expect(screen.queryByRole('button', { name: /MKT-REQ-031/ })).toBeNull();
  });

  it('지금 판에 없는 번호로 오면 아무것도 펴지 않는다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} 여기="MKT-REQ-999" />);
    expect((await screen.findByRole('button', { name: /로그인/ })).getAttribute('aria-expanded')).toBe('false');
  });

  it('로그인 묶음의 두 근거를 다 보인다 — 문서끼리 달라 확인 필요가 된 항목', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /로그인/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-040/ }));
    for (const b of 로그인실패.basis) expect(screen.getByText(`「${b.quote}」`)).toBeTruthy();
  });
});

describe('PRD 관리 — 워드로 내려받기', () => {
  it('보기 권한만 있어도 받고, 받는 동안 막고, 서버가 준 이름으로 저장한다', async () => {
    let 끝내기: (값: { 파일: Blob; 머리: string | null }) => void = () => undefined;
    워드.mockReturnValue(new Promise((r) => (끝내기 = r)));
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:prd'), revokeObjectURL: vi.fn() });
    const 누름 = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<Prd service="MKT" 할수={보는사람} />);

    fireEvent.click(await screen.findByRole('button', { name: '워드로 내려받기' }));
    expect(워드).toHaveBeenCalledWith('MKT');
    expect(screen.getByRole('button', { name: '만드는 중…' })).toHaveProperty('disabled', true);

    끝내기({ 파일: new Blob(['x']), 머리: 'attachment; filename="MKT-PRD-v12.docx"' });
    await vi.waitFor(() => expect(누름).toHaveBeenCalledOnce());
    expect((누름.mock.contexts[0] as HTMLAnchorElement).download).toBe('MKT-PRD-v12.docx');
    expect(screen.getByRole('button', { name: '워드로 내려받기' })).toHaveProperty('disabled', false);
    누름.mockRestore();
  });

  it('거절당하면 알림 줄에 까닭을 띄우고 저장하지 않는다', async () => {
    워드.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'authoring:read', []));
    const 누름 = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    render(<Prd service="MKT" 할수={보는사람} />);

    fireEvent.click(await screen.findByRole('button', { name: '워드로 내려받기' }));
    expect((await screen.findByRole('status')).className).toBe('prd-note bad');
    expect(누름).not.toHaveBeenCalled();
    누름.mockRestore();
  });
});
