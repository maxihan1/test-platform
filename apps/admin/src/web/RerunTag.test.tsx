// @vitest-environment jsdom
// 한 건 실행이 붙은 실행의 결과 화면 — 다시 실행 꼬리표 · 원래 결과 보기 · 덮인 항목의 상세는 한 건 실행 번호로 (도메인/실행 §8.3 「한 건 실행이 붙은 실행」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type 다시실행 } from './api.js';
import { groupByCase } from './group.js';
import { RUN_ID, 그리기, 상세, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';
import { 결과줄 } from './RunResultRow.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 한건번호 = 6001;
const 덮음: 다시실행 = { runId: 한건번호, finishedAt: '2026-10-30T01:00:00.000Z', triggeredBy: '김실행', original: { historyId: 3, status: 'FAIL', finishedAt: '2026-10-29T01:00:00.000Z' } };

describe('실패 카드 (덮인 디바이스가 다시 실행해서도 실패)', () => {
  it('꼬리표와 실행자를 달고, 「원래 결과 보기」를 펴면 이 실행의 원래 항목을 읽는다', async () => {
    const 원래 = vi.spyOn(api, 'item').mockResolvedValue({ ...상세(3, 'desktop'), runId: RUN_ID });
    그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 9, { rerun: 덮음 }, { runId: 한건번호 })])]), [줄(9, 'ZZI-0001', 'desktop', 'FAIL', { rerun: 덮음 })]);

    expect(await screen.findByText(/^다시 실행해서도 실패 · .* · 김실행$/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '상세' }).getAttribute('href')).toBe(`#/runs/${String(한건번호)}/items/9`);

    const 접힘 = document.querySelector('details.fc-orig') as HTMLDetailsElement;
    expect(접힘.querySelector('summary')?.textContent).toMatch(/^원래 결과 보기 실패 /);
    expect(원래).not.toHaveBeenCalled();
    접힘.open = true;
    fireEvent(접힘, new Event('toggle'));
    await waitFor(() => expect(원래).toHaveBeenCalledWith(RUN_ID, 3));
  });

  it('덮이지 않은 디바이스에는 꼬리표도 원래 결과도 없다', async () => {
    그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]));
    await screen.findByText('회원가입');
    expect(screen.queryByText(/다시 실행해서/)).toBeNull();
    expect(document.querySelector('details.fc-orig')).toBeNull();
  });
});

describe('결과 줄 (다시 실행해서 통과)', () => {
  it('꼬리표를 달고 판정 고리 · 「상세」 · 펼친 본문은 한 건 실행 번호로 연다', async () => {
    const 읽기 = vi.spyOn(api, 'item').mockResolvedValue({ ...상세(9, 'desktop'), runId: 한건번호 });
    const group = groupByCase([줄(9, 'ZZI-0001', 'desktop', 'PASS', { rerun: 덮음 })])[0]!;
    render(<결과줄 group={group} columns={['desktop']} runId={RUN_ID} />);

    expect(screen.getByText(/^다시 실행해서 통과 · /)).toBeTruthy();
    const 주소들 = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(주소들).toEqual([`#/runs/${String(한건번호)}/items/9`, `#/runs/${String(한건번호)}/items/9`]);

    fireEvent.click(screen.getByRole('button', { name: /펼치기/ }));
    await waitFor(() => expect(읽기).toHaveBeenCalledWith(한건번호, 9));
  });
});
