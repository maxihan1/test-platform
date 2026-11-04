// @vitest-environment jsdom
// 결정 목록 — 고른 것이나 고친 글이 있으면 화면을 떠나기 전에 묻는다 (공통/5-화면공통 §8 「저장 안 한 내용이 있으면 떠나기 전에 묻는다」)
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthoringDecide } from './AuthoringDecide.js';
import { 요약 } from './authoringSummary.fixture.js';
import type { 결정목록, 결정항목 } from './decideApi.js';
import { 주소로간다, 주소보기, 주소에선다 } from './keepState.fixture.js';

const 반영: 결정항목 = { key: 'apply:10:11', group: 1, kind: 'APPLY', picks: ['APPLY', 'REJECT'], blockedBy: null, rootId: 10, runId: 11, summary: 요약(), prUrl: 'https://github.com/x/pull/1', requestedByName: '맥시', finishedAt: null };
const 화면확인: 결정항목 = { key: 'check:DMW-REQ-349', group: 2, kind: 'CHECK', picks: ['SAME', 'EDIT'], blockedBy: null, reqId: 'DMW-REQ-349', feature: '약관', text: 'DMW-REQ-349 제목이 보인다', checkSince: null, basis: 'SCREEN', options: [] };
const 목록 = (items: 결정항목[]): 결정목록 => ({ prdVersion: 3, count: items.length, open: [], items, failMore: 0 });

function 그리기(items: 결정항목[]) {
  주소에선다('#/authoring');
  render(
    <>
      <주소보기 />
      <AuthoringDecide service="DMW" 목록={목록(items)} envs={[]} 다시읽기={() => {}} />
    </>,
  );
}

afterEach(cleanup);

describe('결정 목록 떠나기 묻기', () => {
  it('아무것도 안 골랐으면 그냥 간다', async () => {
    그리기([반영]);
    await 주소로간다('#/cases');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('hash').textContent).toBe('#/cases');
  });

  it('하나라도 골랐으면 묻고 주소는 그대로다', async () => {
    그리기([반영]);
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    await 주소로간다('#/cases');
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    expect(screen.getByTestId('hash').textContent).toBe('#/authoring');
  });

  it('수정 칸을 열기만 하고 안 고쳤으면 묻지 않는다', async () => {
    그리기([화면확인]);
    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    await 주소로간다('#/cases');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('hash').textContent).toBe('#/cases');
  });

  it('수정 칸의 글을 고쳤으면 묻는다', async () => {
    그리기([화면확인]);
    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '고친 글' } });
    await 주소로간다('#/cases');
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    expect(screen.getByTestId('hash').textContent).toBe('#/authoring');
  });
});
