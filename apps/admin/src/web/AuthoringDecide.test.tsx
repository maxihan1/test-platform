// @vitest-environment jsdom
// 결정 목록 화면 검사 — 묶음 · 고르기 · 권한 없는 버튼 · ③ 기다림 · 진행 · 낡은 목록 (도메인/작성 §3.6 「★ 결정 목록」)
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api.js';
import { AuthoringDecide } from './AuthoringDecide.js';
import type { 결정목록, 결정항목, 보낼고름 } from './decideApi.js';

const 보낸: { prdVersion: number; picks: 보낼고름[] }[] = [];
const 진행답: { 값: Promise<{ steps: { step: 1 | 2 | 3 | 4 | 5; key: string | null; requestId: number | null; version: number | null }[] }> | null } = { 값: null };

vi.mock('./decideApi.js', () => ({
  decideApi: {
    run: (_service: string, prdVersion: number, picks: 보낼고름[]) => {
      보낸.push({ prdVersion, picks });
      return 진행답.값 ?? Promise.resolve({ steps: [] });
    },
  },
}));

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return { ...진짜, api: { authoringRequest: (_s: string, id: number) => Promise.resolve({ id, status: id === 501 ? 'RUNNING' : 'PENDING' }) } };
});

const 반영: 결정항목 = { key: 'apply:10:11', group: 1, kind: 'APPLY', picks: ['APPLY'], blockedBy: null, rootId: 10, runId: 11, summary: null, prUrl: 'https://github.com/x/pull/1', requestedByName: '맥시', finishedAt: null };
const 화면확인 = (reqId: string): 결정항목 => ({
  key: `check:${reqId}`, group: 2, kind: 'CHECK', picks: ['SAME', 'EDIT'], blockedBy: null, reqId, feature: '약관', text: `${reqId} 제목이 보인다`, checkSince: null, basis: 'SCREEN', options: [],
});
const 바뀐요구: 결정항목 = {
  key: 'prd:1:2', group: 3, kind: 'PRD_CHANGED', picks: ['REDO'], blockedBy: null,
  changed: [{ reqId: 'DMW-REQ-012', text: '비밀번호는 10자 이상이다', oldText: '비밀번호는 8자 이상이다' }], added: [], removed: [], scenarios: [{ id: 3, name: '회원가입 흐름' }],
};

function 목록(items: 결정항목[], 덮을것: Partial<결정목록> = {}): 결정목록 {
  return { prdVersion: 3, count: items.filter((x) => x.picks.length > 0).length, open: [], items, failMore: 0, ...덮을것 };
}

beforeEach(() => {
  보낸.length = 0;
  진행답.값 = null;
});
afterEach(cleanup);

describe('결정 목록', () => {
  it('없으면 「결정이 필요한 일이 없습니다」', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getByText('결정이 필요한 일이 없습니다')).toBeTruthy();
  });

  it('고른 것을 차례 목록으로 보이고 한 번에 보낸다 — 「나중에」는 안 보낸다', async () => {
    진행답.값 = Promise.resolve({
      steps: [
        { step: 2, key: 'check:DMW-REQ-349', requestId: null, version: 4 },
        { step: 3, key: 반영.key, requestId: 501, version: null },
        { step: 4, key: 바뀐요구.key, requestId: 502, version: null },
      ],
    });
    const 다시읽기 = vi.fn();
    render(<AuthoringDecide service="DMW" 목록={목록([반영, 화면확인('DMW-REQ-349'), 화면확인('DMW-REQ-350'), 바뀐요구])} envs={[]} 다시읽기={다시읽기} />);
    expect(screen.getByText('AI 가 만든 테스트를 올릴까요?')).toBeTruthy();
    expect(screen.getByText('고른 내용은 기획서(PRD) 새 버전으로 저장됩니다')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'SC-3 회원가입 흐름' })).toBeTruthy();
    const 진행버튼 = () => screen.getByRole('button', { name: /^결정한 \d+건 진행$/ });
    expect((진행버튼() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('아직 고른 것이 없습니다')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '올린다 (반영)' }));
    fireEvent.click(screen.getAllByRole('button', { name: '의도와 같음' })[0]!);
    fireEvent.click(screen.getAllByRole('button', { name: '나중에' })[2]!);
    fireEvent.click(screen.getByRole('button', { name: '다시 만든다' }));
    expect(screen.getByText('기획서를 새 버전으로 저장합니다(버전 4) — DMW-REQ-349 확정')).toBeTruthy();
    expect(screen.getByText('#10 테스트를 케이스 목록에 올립니다')).toBeTruthy();
    expect(screen.getByText('바뀐 요구 1건의 테스트를 고치고 다시 만듭니다')).toBeTruthy();

    fireEvent.click(진행버튼());
    expect(await screen.findByText('진행을 시작했습니다')).toBeTruthy();
    expect(보낸).toEqual([
      { prdVersion: 3, picks: [{ key: 반영.key, pick: 'APPLY' }, { key: 'check:DMW-REQ-349', pick: 'SAME' }, { key: 바뀐요구.key, pick: 'REDO' }] },
    ]);
    expect(다시읽기).toHaveBeenCalled();
    expect(await screen.findByText(/· 진행 중/)).toBeTruthy();
    expect(screen.getByText(/· 앞 일이 끝나면 시작/)).toBeTruthy();
    expect(screen.getByText(/· 끝남/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '#10 요청 보기' }).getAttribute('href')).toBe('#/authoring/10');
  });

  it('고를 권한이 없으면 버튼 자리에 누구에게 부탁할지 한 줄', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([{ ...반영, picks: [], blockedBy: 'ADMIN_ONLY' }])} envs={[]} 다시읽기={() => {}} />);
    expect(screen.queryByRole('button', { name: '올린다 (반영)' })).toBeNull();
    expect(screen.getByText('반영은 운영자가 합니다')).toBeTruthy();
  });

  it('③ 이 열린 작성을 기다리면 버튼 없이 「#N 이 반영된 뒤에 셉니다」', () => {
    const 기다림: 결정항목 = { ...바뀐요구, picks: [], blockedBy: 'AUTHORING_OPEN', changed: null, added: null, removed: null };
    render(<AuthoringDecide service="DMW" 목록={목록([기다림], { open: [14675] })} envs={[]} 다시읽기={() => {}} />);
    expect(screen.getByRole('link', { name: '#14675' }).getAttribute('href')).toBe('#/authoring/14675');
    expect(screen.getByText('이 반영된 뒤에 셉니다', { exact: false })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '다시 만든다' })).toBeNull();
  });

  it('반영 대기를 기다리는 ③ 은 ① 을 「올린다」로 골라야 켜진다', () => {
    const 대기: 결정항목 = { ...바뀐요구, needsApply: true, changed: null, added: null, removed: null };
    render(<AuthoringDecide service="DMW" 목록={목록([반영, 대기])} envs={[]} 다시읽기={() => {}} />);
    const 다시 = () => screen.getByRole('button', { name: '다시 만든다' }) as HTMLButtonElement;
    expect(다시().disabled).toBe(true);
    expect(screen.getByText('1번을 모두 「올린다」로 골라야 고를 수 있습니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '올린다 (반영)' }));
    expect(다시().disabled).toBe(false);
  });

  it('화면 기준 요구를 「다름」으로 고치면 바뀐 요구도 같이 다시 만들고 그 「나중에」를 끈다', () => {
    render(<AuthoringDecide service="DMW" 목록={목록([화면확인('DMW-REQ-349'), 바뀐요구])} envs={[]} 다시읽기={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '다름 · 기획서 고치기' }));
    fireEvent.change(screen.getByRole('textbox', { name: '원래 의도한 동작' }), { target: { value: '큰 제목 「서비스 이용약관」' } });
    expect(screen.getByText('기획서 문장이 바뀌어 바뀐 요구도 같이 다시 만듭니다')).toBeTruthy();
    const 나중 = screen.getAllByRole('button', { name: '나중에' });
    expect((나중[나중.length - 1] as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('문장이 바뀐 요구 1건 · 바뀐 요구 1건의 테스트를 고치고 다시 만듭니다 (바뀐 요구도 같이 다시 만듭니다)')).toBeTruthy();
  });

  it('그 사이 목록이 바뀌었으면 고른 것을 비우고 다시 불러왔다고 알린다', async () => {
    진행답.값 = Promise.reject(new ApiError(409, 'DECISIONS_STALE', ''));
    const 다시읽기 = vi.fn();
    render(<AuthoringDecide service="DMW" 목록={목록([반영])} envs={[]} 다시읽기={다시읽기} />);
    fireEvent.click(screen.getByRole('button', { name: '올린다 (반영)' }));
    fireEvent.click(screen.getByRole('button', { name: '결정한 1건 진행' }));
    expect(await screen.findByText('그 사이 바뀐 것이 있어 다시 불러왔습니다')).toBeTruthy();
    expect(다시읽기).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '올린다 (반영)' }).getAttribute('aria-pressed')).toBe('false');
  });
});
