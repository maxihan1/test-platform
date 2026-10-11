// @vitest-environment jsdom
// 실패 카드 「실패 원인」 줄 검사 — 버튼 보임 · 숨김 · 누른 뒤 상태 · 오류 (도메인/리포팅 「실패 요구사항」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

import { api, ApiError, type FailureJudgment } from './api.js';
import { prdApi } from './prdApi.js';
import type { 판정 } from './role.js';
import { RUN_ID, 그리기, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 모두: 판정 = () => true;
const 실행만: 판정 = (무엇) => 무엇 === '실행';
const 작성만: 판정 = (무엇) => 무엇 === '작성요청';

const 요구: { reqId: string; text: string | null }[] = [{ reqId: 'ZZI-R1', text: '가입하면 안내가 보인다' }];
const 판에없음: { reqId: string; text: string | null }[] = [{ reqId: 'OLD-9', text: null }];

function 열기(판정값: FailureJudgment, reqs = 요구, 권한: 판정 = 모두) {
  return 그리기(
    쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)], { reqs, judgment: 판정값 })]),
    [줄(1, 'ZZI-0001', 'desktop', 'FAIL')],
    'ALL',
    권한,
  );
}

const 버튼 = (이름: string) => screen.queryByRole('button', { name: 이름 });

describe('실패 원인 줄 — 버튼', () => {
  it('판정이 없고 권한이 다 있으면 「화면이 맞음」과 「버그」가 선다', async () => {
    열기(null);

    await screen.findByText('실패 원인');
    expect(버튼('화면이 맞음')).not.toBeNull();
    expect(버튼('버그')).not.toBeNull();
  });

  it('실행 쓰기만 있으면 「버그」만, 작성 쓰기만 있으면 「화면이 맞음」만 선다', async () => {
    열기(null, 요구, 실행만);
    await screen.findByText('실패 원인');
    expect(버튼('화면이 맞음')).toBeNull();
    expect(버튼('버그')).not.toBeNull();
    cleanup();

    열기(null, 요구, 작성만);
    await screen.findByText('실패 원인');
    expect(버튼('화면이 맞음')).not.toBeNull();
    expect(버튼('버그')).toBeNull();
  });

  it('권한이 하나도 없고 판정도 없으면 줄이 없다', async () => {
    열기(null, 요구, () => false);

    await screen.findByRole('article');
    expect(screen.queryByText('실패 원인')).toBeNull();
  });

  it('덮는 요구가 판에 없으면 「화면이 맞음」을 두지 않는다', async () => {
    열기(null, 판에없음);

    await screen.findByText('실패 원인');
    expect(버튼('화면이 맞음')).toBeNull();
    expect(버튼('버그')).not.toBeNull();
  });

  it('덮는 요구가 아예 없어도 「화면이 맞음」은 없다', async () => {
    열기(null, []);

    await screen.findByText('실패 원인');
    expect(버튼('화면이 맞음')).toBeNull();
  });
});

describe('실패 원인 줄 — 판정이 남은 카드', () => {
  it('화면이 맞음이 이미 있으면 요청 고리와 사람을 적고 버튼은 없다', async () => {
    열기({ kind: 'SCREEN', requestId: 77, byName: '김철수', at: '2026-10-11T01:00:00.000Z' });

    const 고리 = await screen.findByRole('link', { name: '작성 요청 #77' });
    expect(고리.getAttribute('href')).toBe('#/authoring/77');
    expect(screen.getByText(/김철수/)).toBeDefined();
    expect(버튼('화면이 맞음')).toBeNull();
    expect(버튼('버그')).toBeNull();
  });

  it('버그가 이미 있으면 「화면이 맞음으로 바꾸기」만 남는다', async () => {
    열기({ kind: 'BUG', byName: '박영희', at: '2026-10-11T01:00:00.000Z' });

    await screen.findByText(/박영희/);
    expect(버튼('화면이 맞음으로 바꾸기')).not.toBeNull();
    expect(버튼('버그')).toBeNull();
    expect(버튼('화면이 맞음')).toBeNull();
  });
});

describe('실패 원인 줄 — 누르기', () => {
  it('「버그」를 누르면 서버에 남기고 바로 버그 한 줄로 바뀐다', async () => {
    const 남김 = vi.spyOn(api, 'markBug').mockResolvedValue({ byName: '김철수', at: '2026-10-11T01:00:00.000Z' });
    열기(null);

    fireEvent.click(await screen.findByRole('button', { name: '버그' }));

    await screen.findByText(/김철수/);
    expect(남김).toHaveBeenCalledWith(RUN_ID, 'ZZI-0001');
    expect(버튼('버그')).toBeNull();
    expect(버튼('화면이 맞음으로 바꾸기')).not.toBeNull();
  });

  it('「화면이 맞음」은 서비스 접두사와 실행 · 케이스를 실어 반영 통로를 부른다', async () => {
    const 반영 = vi.spyOn(prdApi, 'apply').mockResolvedValue({ id: 88 });
    열기(null);

    fireEvent.click(await screen.findByRole('button', { name: '화면이 맞음' }));

    await screen.findByRole('link', { name: '작성 요청 #88' });
    expect(반영).toHaveBeenCalledWith('ZZI', { screenRight: { runId: RUN_ID, tcId: 'ZZI-0001' } });
    expect(버튼('화면이 맞음')).toBeNull();
  });

  it('누른 뒤 카드 재료를 다시 읽어 서버 값으로 맞춘다', async () => {
    vi.spyOn(prdApi, 'apply').mockResolvedValue({ id: 88 });
    const 부름 = 열기(null).부름;
    부름.mockResolvedValue(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)], { reqs: 요구, judgment: { kind: 'SCREEN', requestId: 88, byName: '이순신', at: '2026-10-11T02:00:00.000Z' } })]),
    );

    fireEvent.click(await screen.findByRole('button', { name: '화면이 맞음' }));

    await screen.findByText(/이순신/);
    expect(부름.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('열린 반영이 있으면 안내 글과 그 요청 고리를 보이고 버튼은 그대로다', async () => {
    vi.spyOn(prdApi, 'apply').mockRejectedValue(new ApiError(409, 'APPLY_OPEN', '6101,6102'));
    열기(null);

    fireEvent.click(await screen.findByRole('button', { name: '화면이 맞음' }));

    const 알림 = await screen.findByRole('alert');
    expect(알림.textContent).toContain('이미 열린 반영 요청이 있습니다');
    expect(screen.getByRole('link', { name: '#6101 요청 보기' }).getAttribute('href')).toBe('#/authoring/6101');
    expect(screen.getByRole('link', { name: '#6102 요청 보기' })).toBeDefined();
    expect(버튼('화면이 맞음')).not.toBeNull();
  });

  it('그 밖의 오류는 서버 코드를 사람 말로 보인다', async () => {
    vi.spyOn(api, 'markBug').mockRejectedValue(new ApiError(400, 'NOT_FAILED', 'ZZI-0001'));
    열기(null);

    fireEvent.click(await screen.findByRole('button', { name: '버그' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('이 실행에서 실패한 케이스가 아닙니다'));
    expect(버튼('버그')).not.toBeNull();
  });
});
