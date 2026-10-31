// @vitest-environment jsdom
// 실패 카드 BTS 등록 줄 — 보내는 중 · 등록 실패 + [다시 보내기] · 권한 없으면 글자만 · BTS 안 이으면 줄 없음 (도메인/BTS §8.15)

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

    await screen.findByText('BTS 등록 실패 · 권한 없음 — QA Hub AI 열쇠를 확인하세요 (403)');
    fireEvent.click(screen.getByRole('button', { name: '다시 보내기' }));
    await screen.findByText('BTS 에 보내는 중');
    expect(보냄).toHaveBeenCalledWith(RUN_ID, 'ZZI-0001', 'qa');
    expect(screen.queryByRole('button', { name: '다시 보내기' })).toBeNull();
  });

  it('실행 쓰기 권한이 없으면 단추 없이 글자만 보인다', async () => {
    열기(그만둠, 읽기만);

    await screen.findByText('BTS 등록 실패 · 권한 없음 — QA Hub AI 열쇠를 확인하세요 (403)');
    expect(screen.queryByRole('button', { name: '다시 보내기' })).toBeNull();
  });

  it('보내는 중이면 그 한 줄 · 보냈거나 안 올렸거나 BTS 를 안 이었으면 줄이 없다', async () => {
    열기({ ...그만둠, state: 'SENDING', reason: null });
    await screen.findByText('BTS 에 보내는 중');
    cleanup();

    for (const bts of [{ ...그만둠, state: 'SENT' as const, issueKey: 'DM-12', reason: null }, null, undefined]) {
      열기(bts);
      await screen.findByText('회원가입');
      await waitFor(() => expect(screen.queryByText(/BTS/)).toBeNull());
      cleanup();
    }
  });
});
