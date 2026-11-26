// @vitest-environment jsdom
// 결정 목록 「설명 안 되는 줄」 카드 — 결함 판정 탭에서 이슈 등록 · PRD 수정을 고른다 (도메인/작성 §3.6 「★ 결정 목록」 · 도메인/게임 §3.10 결정 24 의 5)
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthoringDecide } from './AuthoringDecide.js';
import type { 결정목록, 결정항목, 보낼고름 } from './decideApi.js';
import { 물음누름 } from './startConfirm.fixture.js';

const 보낸: 보낼고름[][] = [];

vi.mock('./decideApi.js', () => ({
  decideApi: {
    run: (_service: string, _prdVersion: number, picks: 보낼고름[]) => {
      보낸.push(picks);
      return Promise.resolve({ steps: [] });
    },
  },
}));

const 설명 = (덮을것: Partial<Extract<결정항목, { kind: 'NOTE' }>> = {}): 결정항목 => ({
  key: 'note:21160:ARG-GS-001', group: 2, kind: 'NOTE', picks: ['BUG', 'EDIT'], blockedBy: null,
  runId: 21160, tcId: 'ARG-GS-001', name: '레벨 5 탱커가 임프 3마리를 잡는다',
  reqs: [
    { reqId: 'ARG-REQ-012', text: '준 피해는 무기 공격력이다' },
    { reqId: 'ARG-REQ-013', text: '받은 피해는 방어력을 뺀다' },
  ],
  notes: [{ statement: '준 피해 줄에 인원 보정 1.2', actual: { 값: 14 } }],
  finishedAt: null,
  ...덮을것,
});
const 목록 = (items: 결정항목[]): 결정목록 => ({ prdVersion: 3, count: items.length, open: [], items, failMore: 0 });
const 적용 = () => screen.getByRole('button', { name: /^\d+건 적용$/ }) as HTMLButtonElement;

beforeEach(() => {
  보낸.length = 0;
});
afterEach(cleanup);

describe('설명 안 되는 줄', () => {
  it('결함 판정 탭에 미션 · 규칙 · 줄을 보이고 [이슈 등록]을 고르면 그대로 보낸다', async () => {
    render(<AuthoringDecide service="ARG" 목록={목록([설명()])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getByRole('tab', { name: /결함 판정/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('미션 테스트에 설명 안 되는 줄이 있습니다. 어떻게 처리할까요?')).toBeTruthy();
    expect(screen.getByText('준 피해 줄에 인원 보정 1.2 — {"값":14}')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '이슈 등록' }));
    expect(screen.getByText('ARG-GS-001 설명 안 되는 줄을 결함으로 기록합니다')).toBeTruthy();
    const 적용칸 = 적용();
    fireEvent.click(적용칸);
    물음누름(적용칸.textContent ?? '');
    await waitFor(() => expect(보낸).toEqual([[{ key: 'note:21160:ARG-GS-001', pick: 'BUG' }]]));
  });

  it('[PRD 수정]은 고를 규칙의 문장으로 칸이 열리고 [저장]해야 들어간다 — 고칠 규칙을 바꾸면 그 문장으로 다시 연다', async () => {
    render(<AuthoringDecide service="ARG" 목록={목록([설명()])} envs={[]} 다시읽기={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'PRD 수정' }));
    const 칸 = () => screen.getByRole('textbox', { name: /수정할 요구사항/ }) as HTMLTextAreaElement;
    expect(칸().value).toBe('준 피해는 무기 공격력이다');
    fireEvent.click(screen.getByRole('button', { name: 'ARG-REQ-013' }));
    expect(칸().value).toBe('받은 피해는 방어력을 뺀다');
    fireEvent.change(칸(), { target: { value: '받은 피해는 방어력을 빼고 파티 인원 보정을 곱한다' } });
    expect(적용().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByText('→ 받은 피해는 방어력을 빼고 파티 인원 보정을 곱한다')).toBeTruthy();
    expect(screen.getByText(/ARG-REQ-013 문장 변경/)).toBeTruthy();
    const 적용칸 = 적용();
    fireEvent.click(적용칸);
    물음누름(적용칸.textContent ?? '');
    await waitFor(() =>
      expect(보낸).toEqual([[{ key: 'note:21160:ARG-GS-001', pick: 'EDIT', text: '받은 피해는 방어력을 빼고 파티 인원 보정을 곱한다', option: 1 }]]),
    );
  });

  it('문장을 그대로 저장하면 보낼 것이 없다', () => {
    render(<AuthoringDecide service="ARG" 목록={목록([설명()])} envs={[]} 다시읽기={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'PRD 수정' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(적용().disabled).toBe(true);
  });

  it('실행 쓰기 권한이 없으면 [PRD 수정]만 있고 결함 판정은 누가 하는지 알린다', () => {
    render(<AuthoringDecide service="ARG" 목록={목록([설명({ picks: ['EDIT'], blockedBy: 'NO_RUN_WRITE' })])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.queryByRole('button', { name: '이슈 등록' })).toBeNull();
    expect(screen.getByRole('button', { name: 'PRD 수정' })).toBeTruthy();
    expect(screen.getByText('결함 판정은 실행 쓰기 권한이 있는 사람이 합니다')).toBeTruthy();
  });
});
