// @vitest-environment jsdom
// 실패 카드 「판정」 줄 검사 — 판정이 없으면 결정 목록 고리 · 판정 한 줄 · 버그 뒤 「화면이 맞음으로 바꾸기」 (도메인/리포팅 「실패 요구사항」 · 작성 §3.6 「★ 결정 목록」 「빠지는 것」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';

import { ApiError, type FailureJudgment } from './api.js';
import { decideApi } from './decideApi.js';
import { prdApi } from './prdApi.js';
import type { 판정 } from './role.js';
import { RUN_ID, 그리기, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 모두: 판정 = () => true;
const 실행만: 판정 = (무엇) => 무엇 === '실행';

const 요구: { reqId: string; text: string | null }[] = [{ reqId: 'ZZI-R1', text: '가입하면 안내가 보인다' }];
const 판에없음: { reqId: string; text: string | null }[] = [{ reqId: 'OLD-9', text: null }];
const 버그판정: FailureJudgment = { kind: 'BUG', byName: '박영희', at: '2026-10-11T01:00:00.000Z' };

function 열기(판정값: FailureJudgment, reqs = 요구, 권한: 판정 = 모두) {
  return 그리기(
    쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)], { reqs, judgment: 판정값 })]),
    [줄(1, 'ZZI-0001', 'desktop', 'FAIL')],
    'ALL',
    권한,
  );
}

const 버튼 = (이름: string) => screen.queryByRole('button', { name: 이름 });

function 진행을흉내() {
  vi.spyOn(prdApi, 'versions').mockResolvedValue([{ version: 4, source: 'PERSON', savedByName: '맥시', savedAt: '2026-10-26T01:00:00.000Z', requestId: null, fromDecision: false, changes: null }]);
  return vi.spyOn(decideApi, 'run').mockResolvedValue({ steps: [{ step: 4, key: `fail:${String(RUN_ID)}:ZZI-0001`, requestId: 88, version: null }] });
}

async function 바꾸고확인() {
  fireEvent.click(await screen.findByRole('button', { name: '화면이 맞음으로 바꾸기' }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '화면이 맞음' }));
}

describe('판정 줄 — 판정이 없을 때', () => {
  it('고르는 버튼 없이 테스트 작성 「결정 필요」로 가는 고리만 둔다', async () => {
    열기(null);

    const 고리 = await screen.findByRole('link', { name: '테스트 작성 › 결정 필요에서 판정합니다' });
    expect(고리.getAttribute('href')).toBe('#/authoring?todo=1&service=ZZI');
    expect(버튼('화면이 맞음')).toBeNull();
    expect(버튼('버그')).toBeNull();
  });

  it('작성 보기 권한이 없으면 고리 없이 글자뿐이다', async () => {
    열기(null, 요구, 실행만);

    await screen.findByText('테스트 작성 › 결정 필요에서 판정합니다');
    expect(screen.queryByRole('link', { name: '테스트 작성 › 결정 필요에서 판정합니다' })).toBeNull();
  });
});

describe('판정 줄 — 판정이 남은 카드', () => {
  it('화면이 맞음이 이미 있으면 요청 고리와 사람을 적고 버튼은 없다', async () => {
    열기({ kind: 'SCREEN', requestId: 77, byName: '김철수', at: '2026-10-11T01:00:00.000Z' });

    const 고리 = await screen.findByRole('link', { name: '작성 요청 #77' });
    expect(고리.getAttribute('href')).toBe('#/authoring/77');
    expect(screen.getByText(/김철수/)).toBeDefined();
    expect(버튼('화면이 맞음으로 바꾸기')).toBeNull();
  });

  it('버그가 이미 있으면 「화면이 맞음으로 바꾸기」만 남는다', async () => {
    열기(버그판정);

    await screen.findByText(/박영희/);
    expect(버튼('화면이 맞음으로 바꾸기')).not.toBeNull();
    expect(버튼('버그')).toBeNull();
  });

  it('작성 쓰기가 없거나 덮는 요구가 판에 없으면 바꾸기도 없다', async () => {
    열기(버그판정, 요구, 실행만);
    await screen.findByText(/박영희/);
    expect(버튼('화면이 맞음으로 바꾸기')).toBeNull();
    cleanup();

    열기(버그판정, 판에없음);
    await screen.findByText(/박영희/);
    expect(버튼('화면이 맞음으로 바꾸기')).toBeNull();
  });
});

describe('판정 줄 — 화면이 맞음으로 바꾸기', () => {
  it('먼저 묻고, 「아니오」면 서버를 부르지 않는다', async () => {
    const 진행 = 진행을흉내();
    열기(버그판정);

    fireEvent.click(await screen.findByRole('button', { name: '화면이 맞음으로 바꾸기' }));
    const 창 = await screen.findByRole('dialog');
    expect(within(창).getByText(/작성 요청을 바로 만듭니다/)).toBeTruthy();
    fireEvent.click(within(창).getByRole('button', { name: '아니오' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(진행).not.toHaveBeenCalled();
  });

  it('창 안에 처음 깨진 확인의 기대 결과와 지금 화면을 같이 보인다', async () => {
    진행을흉내();
    열기(버그판정);

    fireEvent.click(await screen.findByRole('button', { name: '화면이 맞음으로 바꾸기' }));
    const 창 = await screen.findByRole('dialog');
    expect(within(창).getByText('가입한 이메일이 보인다')).toBeTruthy();
    expect(within(창).getByText(/기대 new@demo\.kr · 지금 화면/)).toBeTruthy();
    expect(within(창).getByText('없음').tagName).toBe('B');
  });

  it('지금 기획서 버전과 그 실패 하나를 결정 진행으로 보내고 세운 요청 고리를 단다', async () => {
    const 진행 = 진행을흉내();
    열기(버그판정);

    await 바꾸고확인();

    await screen.findByRole('link', { name: '작성 요청 #88' });
    expect(진행).toHaveBeenCalledWith('ZZI', 4, [{ key: `fail:${String(RUN_ID)}:ZZI-0001`, pick: 'SCREEN' }]);
    expect(버튼('화면이 맞음으로 바꾸기')).toBeNull();
  });

  it('누른 뒤 카드 재료를 다시 읽어 서버 값으로 맞춘다', async () => {
    진행을흉내();
    const 부름 = 열기(버그판정).부름;
    부름.mockResolvedValue(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)], { reqs: 요구, judgment: { kind: 'SCREEN', requestId: 88, byName: '이순신', at: '2026-10-11T02:00:00.000Z' } })]),
    );

    await 바꾸고확인();

    await screen.findByText(/이순신/);
    expect(부름.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('서버가 거절하면 까닭을 사람 말로 보이고 버튼은 남는다', async () => {
    진행을흉내().mockRejectedValue(new ApiError(409, 'DECISIONS_STALE', ''));
    열기(버그판정);

    await 바꾸고확인();

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('그 사이 바뀐 것이 있습니다'));
    expect(버튼('화면이 맞음으로 바꾸기')).not.toBeNull();
  });
});
