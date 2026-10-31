// @vitest-environment jsdom
// 「PRD 관리 › 버전 기록」 검사 — 어디서 · 바뀐 것 · 복원 (도메인/작성 §3.6 「기획서 버전 — 어디서 · 바뀐 것」). PrdEdit.test.tsx 가 300줄을 넘어 뗐다
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { PrdItem } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Prd } from './Prd.js';
import { 판, 아이디, 아이디칸, 잠금 } from './prd.fixture.js';
import type { PrdItemDraft, PrdNow, PrdVersionRow } from './prdApi.js';
import type { 판정 } from './role.js';

const { 지금, 저장, 판들, 되돌림, 한판 } = vi.hoisted(() => ({
  지금: vi.fn((_s: string): Promise<PrdNow> => Promise.reject(new Error('판을 정하지 않았다'))),
  저장: vi.fn((_s: string, _base: number, _items: PrdItemDraft[]) => Promise.resolve({ version: 13 })),
  판들: vi.fn((_s: string): Promise<PrdVersionRow[]> => Promise.resolve([])),
  되돌림: vi.fn((_s: string, _base: number, _to: number) => Promise.resolve({ version: 13 })),
  한판: vi.fn((_s: string, _v: number): Promise<{ version: number; items: PrdItem[] }> => Promise.reject(new Error('옛 버전을 정하지 않았다'))),
}));

vi.mock('./prdApi.js', () => ({ prdApi: { now: 지금, save: 저장, versions: 판들, revert: 되돌림, version: 한판, apis: () => Promise.resolve({ apis: [] }) } }));

const 쓰는사람: 판정 = () => true;

beforeEach(() => {
  지금.mockReset();
  지금.mockResolvedValue(판());
  저장.mockClear();
  판들.mockReset();
  판들.mockResolvedValue([
    { version: 12, source: 'PERSON', savedByName: '한지수', savedAt: '2026-10-09T08:42:00.000Z', requestId: null, fromDecision: false, changes: null },
    { version: 11, source: 'AGENT', savedByName: '작성 에이전트', savedAt: '2026-10-01T00:12:00.000Z', requestId: 14681, fromDecision: false, changes: null },
  ]);
  되돌림.mockClear();
  // 버전마다 첫 요구의 문장이 달라 앞 버전과 견주면 늘 「바뀜 1건」이다
  한판.mockReset();
  한판.mockImplementation((_s, version) => Promise.resolve({ version, items: [{ ...아이디, text: `문장 ${version}` }] }));
});

afterEach(() => cleanup());

describe('PRD 관리 — 버전 기록', () => {
  it('작성 쓰기가 없으면 버전 기록은 보이고 복원은 아예 없다', async () => {
    render(<Prd service="MKT" 할수={() => false} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    expect(await screen.findByText('AI 작성 #14681')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /복원/ })).toBeNull();
  });

  it('버전마다 누가 무엇으로 저장했는지 보이고 현재 버전에는 복원이 없다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    expect(within(줄들[0]!).getByText('직접 수정')).toBeTruthy();
    expect(within(줄들[0]!).getByText('한지수')).toBeTruthy();
    expect(within(줄들[0]!).getByText('현재 버전')).toBeTruthy();
    expect(within(줄들[0]!).queryByRole('button', { name: '이 버전으로 복원' })).toBeNull();
    expect(within(줄들[1]!).getByText('AI 작성 #14681')).toBeTruthy();
    expect(within(줄들[1]!).getByText('작성 에이전트')).toBeTruthy();
    expect(within(줄들[1]!).queryByText('현재 버전')).toBeNull();
  });

  it('어디서 칸은 출처마다 글이 다르다 — 요청 번호 · 결정에서 · 되돌림', async () => {
    const 행 = (version: number, source: PrdVersionRow['source'], 덮을것: Partial<PrdVersionRow> = {}): PrdVersionRow => ({
      version, source, savedByName: '맥시', savedAt: '2026-10-09T08:42:00.000Z', requestId: null, fromDecision: false, changes: null, ...덮을것,
    });
    판들.mockResolvedValue([
      행(16, 'REVERT'),
      행(15, 'DECISION'),
      행(14, 'AGENT', { requestId: 20, fromDecision: true }),
      행(13, 'AGENT', { requestId: null }),
      행(12, 'AGENT', { requestId: 14681 }),
    ]);
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    const 칸 = (n: number) => 줄들[n]!.querySelectorAll('td')[1]!.textContent;
    expect([0, 1, 2, 3, 4].map(칸)).toEqual(['되돌림', '테스트 작성에서 결정', '테스트 작성에서 결정 · AI #20', 'AI 작성', 'AI 작성 #14681']);
    expect([...줄들[0]!.closest('table')!.querySelectorAll('th')].map((th) => th.textContent)).toEqual(['버전', '어디서', '바뀐 것', '저장한 사람', '저장 일시', '']);
  });

  it('changes 가 있으면 앞 버전을 읽지 않고 그 줄을 그대로 적는다 — 종류 · 번호 · 새 문장 · 까닭', async () => {
    판들.mockResolvedValue([
      {
        version: 12,
        source: 'DECISION',
        savedByName: '맥시',
        savedAt: '2026-10-26T06:20:00.000Z',
        requestId: null,
        fromDecision: false,
        changes: [
          { kind: 'EDIT', reqId: 'MKT-REQ-088', text: '주문 취소 버튼은 배송 전에만 보인다', asset: null, tcId: 'MKT-FN-271' },
          { kind: 'PICK', reqId: 'MKT-REQ-021', text: '쿠폰은 한 번만 쓴다', asset: '화면설명메모.md', tcId: null },
          { kind: 'CONFIRM', reqId: 'MKT-REQ-349', text: null, asset: null, tcId: null },
        ],
      },
    ]);
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄 = (await screen.findAllByRole('row'))[1]!;
    expect(within(줄).getAllByRole('listitem').map((x) => x.textContent)).toEqual([
      '문장 변경MKT-REQ-088주문 취소 버튼은 배송 전에만 보인다 · 화면이 맞음(MKT-FN-271)',
      '문구 선택MKT-REQ-021쿠폰은 한 번만 쓴다 · 화면설명메모.md 쪽',
      '확정MKT-REQ-349',
    ]);
    expect(within(줄).queryByRole('button', { name: '바뀐 것 보기' })).toBeNull();
    expect(한판).not.toHaveBeenCalled();
  });

  it('PRD 초안에서 온 추가 · 삭제 · 확인 필요 줄은 종류와 이슈 키를 적는다', async () => {
    판들.mockResolvedValue([
      {
        version: 13,
        source: 'DECISION',
        savedByName: '맥시',
        savedAt: '2026-10-31T06:20:00.000Z',
        requestId: null,
        fromDecision: false,
        changes: [
          { kind: 'ADD', reqId: 'MKT-REQ-401', text: '쿠폰은 한 번만 쓴다', asset: null, tcId: null, issueKeys: ['DM-12'] },
          { kind: 'DEL', reqId: 'MKT-REQ-033', text: null, asset: null, tcId: null, issueKeys: ['DM-14', 'DM-15'] },
          { kind: 'CHECK', reqId: 'MKT-REQ-034', text: null, asset: null, tcId: null },
        ],
      },
    ]);
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄 = (await screen.findAllByRole('row'))[1]!;
    expect(within(줄).getAllByRole('listitem').map((x) => x.textContent)).toEqual([
      '추가MKT-REQ-401쿠폰은 한 번만 쓴다 · DM-12 에서 옴',
      '삭제MKT-REQ-033DM-14, DM-15 에서 옴',
      '확인 필요로 바꿈MKT-REQ-034',
    ]);
  });

  it('버전마다 앞 버전과 견준 바뀐 것을 한 줄로 보이고, 누르면 바뀐 요구가 펼쳐진다 (점검 8.8)', async () => {
    한판.mockImplementation((_s, version) =>
      Promise.resolve({ version, items: version === 11 ? [아이디, 아이디칸] : [아이디, { ...아이디칸, text: '아이디 칸에는 12자까지만 들어간다(고침)' }, 잠금] }),
    );
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    const 요약 = await within(줄들[0]!).findByRole('button', { name: '바뀜 1건 · 새 항목 1건' });
    expect(한판).toHaveBeenCalledWith('MKT', 11);
    expect(한판).toHaveBeenCalledWith('MKT', 12);
    expect(within(줄들[1]!).getByText('처음 버전')).toBeTruthy();
    expect(within(줄들[0]!).queryByRole('list')).toBeNull();
    fireEvent.click(요약);
    const 목록 = within(줄들[0]!).getByRole('list', { name: '버전 12에서 바뀐 요구' });
    const 항목들 = within(목록).getAllByRole('listitem').map((x) => x.textContent);
    expect(항목들).toEqual([
      '바뀜MKT-REQ-032아이디 칸에는 12자까지만 들어간다 → 아이디 칸에는 12자까지만 들어간다(고침)',
      `새 항목MKT-REQ-041${잠금.text}`,
    ]);
  });

  it('상태만 바뀐 요구는 따로 센다', async () => {
    한판.mockImplementation((_s, version) =>
      Promise.resolve({ version, items: [version === 11 ? 아이디칸 : { ...아이디칸, status: 'CONFIRMED' as const }] }),
    );
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    fireEvent.click(await within(줄들[0]!).findByRole('button', { name: '상태만 바뀜 1건' }));
    expect(within(줄들[0]!).getByText('확정으로 바뀜')).toBeTruthy();
  });

  it('글과 상태를 한 번에 고친 요구는 상태도 같이 적는다', async () => {
    한판.mockImplementation((_s, version) =>
      Promise.resolve({ version, items: [version === 11 ? 아이디칸 : { ...아이디칸, text: '고친 문장', status: 'CONFIRMED' as const }] }),
    );
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    fireEvent.click(await within(줄들[0]!).findByRole('button', { name: '바뀜 1건' }));
    expect(within(줄들[0]!).getByRole('listitem').textContent).toContain('고친 문장 · 확정으로 바뀜');
  });

  it('최근 열 개 밖의 버전은 누를 때만 읽는다', async () => {
    판들.mockResolvedValue(
      Array.from({ length: 12 }, (_, i): PrdVersionRow => ({ version: 12 - i, source: 'PERSON', savedByName: '한지수', savedAt: '2026-10-09T08:42:00.000Z', requestId: null, fromDecision: false, changes: null })),
    );
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    expect(줄들).toHaveLength(12);
    await within(줄들[0]!).findByRole('button', { name: '바뀜 1건' });
    const 열한째 = within(줄들[10]!).getByRole('button', { name: '바뀐 것 보기' });
    const 읽은 = 한판.mock.calls.length;
    fireEvent.click(열한째);
    await within(줄들[10]!).findByRole('button', { name: '바뀜 1건' });
    expect(within(줄들[11]!).getByText('처음 버전')).toBeTruthy();
    // 버전 2 는 앞 줄이 이미 읽어 다시 부르지 않고, 처음 버전 1 만 새로 읽는다
    expect(한판.mock.calls.length).toBe(읽은 + 1);
    expect(한판).toHaveBeenLastCalledWith('MKT', 1);
  });

  it('복원은 한 번 더 묻고, 확인하면 현재 버전 번호와 고른 버전을 보낸다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    fireEvent.click(await screen.findByRole('button', { name: '이 버전으로 복원' }));
    expect(되돌림).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '버전 11 복원 확인' }));
    await vi.waitFor(() => expect(되돌림).toHaveBeenCalledWith('MKT', 12, 11));
    expect(await screen.findByText('저장했습니다 (버전 13)')).toBeTruthy();
  });
});
