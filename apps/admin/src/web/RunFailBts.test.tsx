// @vitest-environment jsdom
// 실패 카드 BTS 등록 줄 — 보내는 중 · 등록 실패 + [다시 보내기] · 권한 없으면 글자만 · BTS 안 이으면 줄 없음 · 판정 줄은 BTS 이슈 고리 (도메인/BTS §8.15)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

import { api, type FailureBts } from './api.js';
import type { 판정 } from './role.js';
import { RUN_ID, 그리기, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 모두: 판정 = () => true;
const 읽기만: 판정 = () => false;

const 그만둠: FailureBts = { issueKey: null, url: null, state: 'GAVE_UP', reason: '권한 없음 — QA Hub AI 열쇠를 확인하세요 (403)', resolution: null };

function 열기(bts: FailureBts | null | undefined, 권한: 판정 = 모두) {
  return 그리기(
    쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)], bts === undefined ? {} : { bts })]),
    [줄(1, 'ZZI-0001', 'desktop', 'FAIL')],
    'ALL',
    권한,
  );
}

describe('BTS 등록 줄', () => {
  it('그만뒀으면 까닭과 [다시 보내기] — 누르면 그 카드를 다시 보내고 「BTS 에 보내는 중」으로 바뀐다', async () => {
    const 보냄 = vi.spyOn(api, 'resendBts').mockResolvedValue(undefined);
    열기(그만둠);

    await screen.findByText('Issue Bunker 등록 실패 · 권한 없음 — QA Hub AI 열쇠를 확인하세요 (403)');
    fireEvent.click(screen.getByRole('button', { name: '다시 보내기' }));
    await screen.findByText('Issue Bunker 에 보내는 중');
    expect(보냄).toHaveBeenCalledWith(RUN_ID, 'ZZI-0001', 'qa');
    expect(screen.queryByRole('button', { name: '다시 보내기' })).toBeNull();
  });

  it('실행 쓰기 권한이 없으면 단추 없이 글자만 보인다', async () => {
    열기(그만둠, 읽기만);

    await screen.findByText('Issue Bunker 등록 실패 · 권한 없음 — QA Hub AI 열쇠를 확인하세요 (403)');
    expect(screen.queryByRole('button', { name: '다시 보내기' })).toBeNull();
  });

  it('보내는 중이면 그 한 줄 · 보냈거나 안 올렸으면 등록 줄은 없고 판정 줄이 맡는다 · BTS 를 안 이었으면 BTS 글자가 없다', async () => {
    열기({ ...그만둠, state: 'SENDING', reason: null });
    await screen.findByText('Issue Bunker 에 보내는 중');
    expect(screen.queryByText(/에서 확인 중/)).toBeNull();
    cleanup();

    for (const bts of [{ ...그만둠, state: 'SENT' as const, issueKey: 'DM-12', reason: null }, null]) {
      열기(bts);
      await screen.findByText('회원가입');
      await waitFor(() => expect(screen.queryByText(/Issue Bunker 등록 실패|Issue Bunker 에 보내는 중/)).toBeNull());
      cleanup();
    }
    열기(undefined);
    await screen.findByText('회원가입');
    await waitFor(() => expect(screen.queryByText(/Issue Bunker/)).toBeNull());
  });
});

describe('BTS 를 이은 프로젝트의 판정 줄', () => {
  const 보냄: FailureBts = { issueKey: 'DM-12', url: 'https://bts.example.com/issues/DM-12', state: 'SENT', reason: null, resolution: null };

  it('올린 이슈는 「BTS DM-12 에서 확인 중」 고리 하나 — 결정 목록 고리 · 「화면이 맞음으로 바꾸기」가 없다', async () => {
    열기(보냄);

    const 고리 = await screen.findByRole('link', { name: 'Issue Bunker DM-12 에서 확인 중' });
    expect(고리.getAttribute('href')).toBe('https://bts.example.com/issues/DM-12');
    expect(screen.queryByRole('link', { name: '테스트 작성 › 결정 필요에서 판정합니다' })).toBeNull();
    expect(screen.queryByRole('button', { name: '화면이 맞음으로 바꾸기' })).toBeNull();
  });

  it('닫혔으면 사유를 덧붙이고, 보일 등록이 없으면(null) 판정 줄도 결정 목록 고리도 없다', async () => {
    열기({ ...보냄, resolution: 'TEST_PROBLEM' });
    await screen.findByRole('link', { name: 'Issue Bunker DM-12 · 테스트 문제로 닫힘' });
    cleanup();

    열기(null);
    await screen.findByText('회원가입');
    expect(screen.queryByText('판정')).toBeNull();
    expect(screen.queryByRole('link', { name: '테스트 작성 › 결정 필요에서 판정합니다' })).toBeNull();
  });
});
