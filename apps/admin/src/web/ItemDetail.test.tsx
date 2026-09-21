// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { api, type RunItemDetail } from './api.js';
import { ItemDetail } from './ItemDetail.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const RUN_ID = 3301;
const HISTORY_ID = 7701;

const 항목: RunItemDetail = {
  runId: RUN_ID,
  runTitle: '결제 회귀',
  historyId: HISTORY_ID,
  tcId: 'ZID-001',
  tcName: '로그인하면 토큰이 발급된다',
  platform: 'desktop',
  attempt: 1,
  params: {},
  paramSchema: {},
  expected: {},
  expectedSchema: {},
  precondition: [],
  status: 'FAIL',
  durationMs: 400,
  error: null,
  startedAt: '2026-09-21T00:00:00.000Z',
  finishedAt: '2026-09-21T00:00:01.000Z',
  steps: [
    {
      seq: 1,
      title: '토큰을 검증한다',
      status: 'FAIL',
      durationMs: 88,
      line: 19,
      screenshotPath: `artifacts/runs/${String(RUN_ID)}/${String(HISTORY_ID)}/1.png`,
      assertions: [
        { statement: '응답 코드가 정상이다', status: 'PASS', expected: 200, actual: 200 },
        { statement: '토큰이 발급된다', status: 'FAIL', expected: true, actual: false },
        { statement: '유효기간이 3600초다', status: 'NA', expected: 3600, actual: null },
      ],
    },
  ],
};

function 그린다() {
  vi.spyOn(api, 'item').mockResolvedValue(항목);
  return render(<ItemDetail runId={RUN_ID} historyId={HISTORY_ID} />);
}

describe('항목 상세 (SPEC §8.4)', () => {
  it('코드 뷰는 접힌 채로 나오고 펼치기 전에는 소스를 읽지 않는다', async () => {
    const 소스 = vi.spyOn(api, 'source').mockResolvedValue({ lines: [], focus: 19 });
    그린다();

    const 코드뷰 = (await screen.findByText('실패 지점 코드')).closest('details');
    expect(코드뷰).not.toBeNull();
    expect(코드뷰!.open).toBe(false);
    expect(소스).not.toHaveBeenCalled();
  });

  it('스크린샷은 실패한 검증 문장 바로 아래에 붙는다. 스텝 끝이 아니다', async () => {
    const { container } = 그린다();

    const 그림 = await screen.findByAltText('토큰을 검증한다 실패 시점 화면');
    const 붙임 = 그림.closest('.after-assert');
    expect(붙임).not.toBeNull();
    expect(붙임!.previousElementSibling?.textContent).toContain('토큰이 발급된다');

    const 차례 = [...container.querySelectorAll('*')];
    expect(차례.indexOf(그림)).toBeGreaterThan(차례.indexOf(screen.getByText('응답 코드가 정상이다')));
    expect(차례.indexOf(그림)).toBeLessThan(차례.indexOf(screen.getByText('유효기간이 3600초다')));
  });
});
