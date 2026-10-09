// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type RunItemDetail } from './api.js';
import { ItemDetail } from './ItemDetail.js';
import type { 판정하기 } from './runJudge.js';
import { 사람 } from './runPick.fixture.js';

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

function 그린다(바꿀것: Partial<RunItemDetail> = {}, 판정: 판정하기 = () => () => true) {
  vi.spyOn(api, 'item').mockResolvedValue({ ...항목, ...바꿀것 });
  return render(<ItemDetail runId={RUN_ID} historyId={HISTORY_ID} 판정하기={판정} />);
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

  // 값을 안 고치고 돌린 항목은 기대값이 비어 박제된다. 그 값은 박제 스키마의 기본값이다 (리포팅 §3.3)
  it('기대결과 칸이 입력값 다음에 있고, 비어 박제된 값은 스키마 기본값으로 보인다', async () => {
    그린다({
      expected: {},
      expectedSchema: { type: 'object', properties: { title: { type: 'string', description: '제목', default: 'AI 올인원' } } },
    });

    const 머리 = await screen.findByText('기대결과');
    const 칸 = 머리.closest('.sec');
    expect(칸?.textContent).toContain('제목');
    expect(칸?.textContent).toContain('AI 올인원');
    expect(칸?.previousElementSibling?.textContent).toContain('입력값');
  });

  it('기대값도 기본값도 없으면 「기대결과 없음」', async () => {
    그린다();

    expect(await screen.findByText('기대결과 없음')).toBeTruthy();
  });
});

describe('값 바꿔 재실행 (도메인/실행 §8.10)', () => {
  const 값있는항목: Partial<RunItemDetail> = {
    params: { userId: 'u-지난', password: '********' },
    paramSchema: {
      type: 'object',
      properties: { userId: { type: 'string', description: '아이디' }, password: { type: 'string', description: '비밀번호' } },
      required: ['password'],
    },
  };

  function 창모킹() {
    vi.spyOn(api, 'caseOf').mockResolvedValue({
      tcId: 'ZID-001',
      name: '로그인하면 토큰이 발급된다',
      platforms: ['desktop'],
      precondition: [],
      filePath: 'tests/ZID-001.spec.ts',
      paramSchema: 값있는항목.paramSchema!,
      expectedSchema: {},
      isActive: true,
      scannedAt: '2026-09-21T00:00:00.000Z',
    });
    vi.spyOn(api, 'me').mockResolvedValue({ user: { ...사람, services: [{ ...사람.services[0]!, prefix: 'ZID' }] } });
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
  }

  it('그 항목 서비스에서 실행할 수 있으면 버튼이 선다', async () => {
    const 물은것: (string | null)[] = [];
    그린다({}, (접두사) => {
      물은것.push(접두사);
      return (무엇) => 무엇 === '실행';
    });

    expect(await screen.findByRole('button', { name: '값 바꿔 재실행' })).toBeTruthy();
    expect(물은것).toContain('ZID');
  });

  it('실행할 수 없으면 버튼이 없다', async () => {
    그린다({}, () => () => false);

    await screen.findByText('실행 결과');
    expect(screen.queryByRole('button', { name: '값 바꿔 재실행' })).toBeNull();
    expect(screen.queryByRole('link', { name: '값 바꿔 재실행' })).toBeNull();
  });

  it('누르면 그 항목에서 쓴 값으로 채운 실행 창이 열리고 비밀값 칸은 비어 있다', async () => {
    창모킹();
    그린다(값있는항목);

    fireEvent.click(await screen.findByRole('button', { name: '값 바꿔 재실행' }));

    const 창 = within(await screen.findByRole('dialog', { name: '실행할 케이스 1건' }));
    expect(((await 창.findByLabelText(/^아이디/)) as HTMLInputElement).value).toBe('u-지난');
    expect((창.getByLabelText('비밀번호') as HTMLInputElement).value).toBe('');
  });

  it('창의 취소를 누르면 창이 닫힌다', async () => {
    창모킹();
    그린다(값있는항목);
    fireEvent.click(await screen.findByRole('button', { name: '값 바꿔 재실행' }));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
