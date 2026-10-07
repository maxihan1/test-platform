// @vitest-environment jsdom
// 실행 결과 화면의 증적 버튼 검사 — 형식 셋이 그려지고 **누른 그 형식**이 서버로 가는지 본다 (SPEC §8.4).
//
// 여기가 사고 자리다. 버튼이 하나이던 시절 호출부가 형식을 `'PDF'` 로 박아 두었고,
// 버튼만 셋으로 늘리면 엑셀을 눌러도 PDF 가 나온다 — 화면은 멀쩡해 보이고 결과만 틀린다.
// 그래서 「엑셀을 누르면 `'XLSX'` 가 간다」가 이 파일의 중심 단언이다.
//
// 한계. jsdom 에는 레이아웃이 없어 버튼이 판정 숫자를 미는지, 좁은 화면에서 접히는지는 못 본다.
// 그건 사람이 브라우저로 본다 (SPEC §9.1). 여기서 보는 축은 **문서에 무슨 글자가 있는가**와
// **어떤 인자로 서버를 불렀는가** 둘이다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import {
  api,
  ApiError,
  type EvidenceRow,
  type FailureCase,
  type ItemStatus,
  type Platform,
  type RunInsights as 비교값,
  type RunItemSummary,
  type RunSummary,
} from './api.js';
import { RunResult } from './RunResult.js';
import { 판정을만든다, type 판정 } from './role.js';
import { scenarioApi } from './scenarioApi.js';
import type { User } from './api.js';

// 옛 등급 셋의 판정을 그대로 옮긴 것 — 운영은 전부, 실행까지는 머지·설정 빼고, 보기만은 받기뿐
const 실행까지: 판정 = (무엇) => 무엇 !== '작성머지' && 무엇 !== '설정';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다.
// 언마운트가 곧 `setInterval` 정리다 — 안 걸면 2초 폴링이 검사를 붙잡는다
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  sessionStorage.clear();
});

const RUN_ID = 2111;

const 실행: RunSummary = {
  runId: RUN_ID,
  title: '결제 회귀',
  triggeredBy: 'kim',
  triggeredByName: '김철수',
  env: 'qa',
  baseUrl: 'https://qa-pay.example.com',
  serviceName: '결제',
  status: 'FINISHED',
  startedAt: '2026-09-15T17:13:00.000Z',
  finishedAt: '2026-09-15T17:25:00.000Z',
  counts: { total: 3, pass: 2, fail: 1, na: 0, running: 0 },
};

function 증적(format: string, status: string, error: string | null = null): EvidenceRow {
  return {
    id: 9,
    format,
    status,
    filePath: status === 'READY' ? `artifacts/evidence/9.${format.toLowerCase()}` : null,
    error,
    generatedAt: '2026-09-15T17:22:00.000Z',
  };
}

function 그리기(status: string, 문서들: EvidenceRow[] = []) {
  vi.spyOn(api, 'run').mockResolvedValue({ ...실행, status, items: [], evidence: 문서들 });
  return render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
}

describe('실행 결과 화면의 증적 버튼 (SPEC §8.4)', () => {
  it('끝난 실행에는 형식마다 만들기 버튼이 하나씩 뜬다', async () => {
    그리기('FINISHED');

    const 글들 = (await screen.findAllByText(/만들기$/)).map((el) => el.textContent);
    expect(글들).toEqual(['PDF 만들기', '엑셀 만들기', 'HTML 만들기']);
  });

  it('요약 띠가 머리 바로 아래에 오고 머리에는 판정 숫자가 없다', async () => {
    const { container } = 그리기('FINISHED');

    await screen.findAllByText(/만들기$/);

    // 머리의 집계 숫자는 요약 띠로 옮겼다 — 같은 숫자를 두 번 두지 않는다 (도메인/실행 §8.3)
    const 머리 = container.querySelector('.head');
    const 띠 = container.querySelector('.rs');
    expect(띠).not.toBeNull();
    expect(머리?.nextElementSibling?.firstElementChild).toBe(띠);
    expect(container.querySelector('.tally')?.textContent).not.toContain('통과');
  });

  it('만들기 버튼은 색을 쓰지 않고 이유를 말풍선에 숨기지 않는다', async () => {
    그리기('FINISHED');

    for (const 버튼 of await screen.findAllByText(/만들기$/)) {
      // 꽉 찬 잉크색을 셋이나 늘어놓으면 판정 숫자가 밀린다. 색은 판정만 갖는다
      expect(버튼.className).toContain('ghost');
      // `title` 은 터치에 안 뜨고 disabled 버튼은 키보드 탭에서도 빠진다 (docs/DESIGN.md)
      expect(버튼.getAttribute('title')).toBeNull();
    }
  });

  it('엑셀 만들기를 누르면 서버로 가는 형식도 엑셀이다', async () => {
    // 끝나지 않는 약속이라 눌린 뒤의 잠금 상태가 그대로 멈춰 선다.
    // 응답이 와서 다시 묻기까지 가면 그 사이 상태를 볼 수 없다
    const 만들기 = vi.spyOn(api, 'makeEvidence').mockReturnValue(new Promise<EvidenceRow>(() => {}));
    그리기('FINISHED');

    fireEvent.click(await screen.findByText('엑셀 만들기'));

    expect(만들기).toHaveBeenCalledWith(RUN_ID, 'XLSX');
    // 하나를 누르면 그 형식만 잠긴다. 셋이 같이 잠기면 PDF 를 못 만든다
    expect(screen.getByText('엑셀 만드는 중')).toBeDefined();
    expect(screen.getByText('PDF 만들기')).toBeDefined();
  });

  it('도는 중에는 만들기 버튼이 없고 안내가 화면 글자로 보인다', async () => {
    그리기('RUNNING');

    // 말풍선(`title`)이 아니라 글자다. 휴대폰에는 올릴 마우스가 없다 (docs/DESIGN.md 접근성)
    expect(await screen.findByText('실행이 끝나면 증적 문서를 만들 수 있습니다')).toBeDefined();
    expect(screen.queryAllByText(/만들기/)).toEqual([]);
  });

  it('엑셀만 실패하면 사유 줄이 어느 형식인지 말한다', async () => {
    그리기('FINISHED', [증적('XLSX', 'FAILED', '시트가 너무 큽니다')]);

    const 줄 = await screen.findByText(/만들지 못했습니다/);
    expect(줄.textContent).toContain('엑셀');
    expect(줄.textContent).toContain('시트가 너무 큽니다');
  });
});

describe('실행 결과 머리의 종류 (PR #132)', () => {
  it('머리 부제 맨 앞에 종류를 적는다 — 사이드바가 이 화면의 종류를 모른다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue({ ...실행, kind: 'UI', status: 'FINISHED', items: [], evidence: [] });
    const { container } = render(<RunResult runId={실행.runId} 판정하기={() => 실행까지} />);
    await waitFor(() => expect(container.querySelector('.head')?.textContent).toMatch(/UI 테스트 · /));
  });
});

type Run상세 = Awaited<ReturnType<typeof api.run>>;

const 도는중응답: Run상세 = {
  ...실행,
  status: 'RUNNING',
  finishedAt: null,
  counts: { total: 3, pass: 1, fail: 0, na: 0, running: 2 },
  items: [],
  evidence: [],
};

const 끝난응답: Run상세 = { ...실행, items: [], evidence: [] };

function 상자라벨(): string | null {
  return screen.getByRole('dialog').getAttribute('aria-label');
}

describe('실행 진행 상자 (SPEC §8.9)', () => {
  it('도는 중인 실행을 열면 진행 상자가 떠 있다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(도는중응답);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await screen.findByRole('dialog');
    expect(상자라벨()).toContain('진행 중입니다');
  });

  it('이미 끝난 실행을 열면 상자가 뜨지 않는다', async () => {
    그리기('FINISHED');

    await screen.findAllByText(/만들기$/);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('진행 상자를 닫아도 폴링은 계속 돈다', async () => {
    vi.useFakeTimers();
    const 부름 = vi.spyOn(api, 'run').mockResolvedValue(도는중응답);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await act(async () => {});

    fireEvent.click(screen.getByText('닫기'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(부름).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(부름).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('진행 상자를 닫은 뒤 실행이 끝나면 완료 상자가 뜬다', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'run').mockResolvedValueOnce(도는중응답).mockResolvedValue(끝난응답);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await act(async () => {});

    fireEvent.click(screen.getByText('닫기'));
    expect(screen.queryByRole('dialog')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(상자라벨()).toContain('끝났습니다');
  });
});

// 상자 635px 중 603px(95%)을 정보 UI 가 먹고 케이스 목록에 32px 만 남았다 — 줄이 101px 이라
// **한 줄도 안 들어갔다.** 증적 정보는 머리로 올리고 견줌은 접는다 (2026-09-22 실측)
describe('상자 안에서 정보 UI 가 목록 자리를 뺏지 않는다 (SPEC §8.3, 2026-09-22)', () => {
  const 견줌있음 = {
    previous: { runId: 2110, startedAt: '2026-09-14T10:00:00.000Z' },
    주소바뀜: false,
    빠진건수: 0,
    케이스들: [
      { tcId: 'DEMO-003', tcName: '할 일 추가', platform: 'desktop' as const, 판정: '새로깨짐' as const },
    ],
    실패덩어리들: [],
  };

  const 첫실행 = { previous: null, 주소바뀜: false, 빠진건수: 0, 케이스들: [], 실패덩어리들: [] };

  it('상자 안에서는 증적 문서 정보가 RUN 머리 줄에 있다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    vi.spyOn(api, 'run').mockResolvedValue({
      ...실행,
      status: 'FINISHED',
      items: [],
      evidence: [증적('PDF', 'READY')],
    });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 상자안 />);
    await screen.findAllByText(/만들기$/);

    const 머리 = document.querySelector('.box-head');
    expect(머리?.textContent, '머리에 증적 문서 줄이 없다').toMatch(/만듦/);
    // 같은 말을 두 번 하지 않는다 — 머리에 올렸으면 본문에 블록으로 또 서지 않는다.
    // **접기(`.sec.fold`)는 빼고 본다** — 그것은 견줌 칸이고 증적과 상관이 없다.
    // 안 빼면 견줌이 있는 실행에서 엉뚱한 이유로 빨개진다 (2026-09-22 자기검토)
    expect(document.querySelector('.screen .sec:not(.fold)')).toBeNull();
  });

  it('화면 전체에서는 증적 문서가 옆 칸에 선다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    그리기('FINISHED', [증적('PDF', 'READY')]);
    await screen.findAllByText(/만들기$/);

    expect(document.querySelector('.box-head')).toBeNull();
    expect(document.querySelector('.rr-side .sec')?.textContent).toMatch(/만듦/);
  });

  it('직전 실행 대비 수는 접지 않고 요약 띠에 바로 보인다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(견줌있음);
    그리기('FINISHED');

    const 대비 = await waitFor(() => {
      const 칸 = document.querySelector('.rs-diff');
      expect(칸).not.toBeNull();
      return 칸!;
    });
    expect(대비.textContent).toContain('RUN 2110');
    expect(대비.textContent).toContain('신규 실패1');
    expect(document.querySelector('details')).toBeNull();
  });

  // SPEC 공통/7-데모와-완료 §7 — 「첫 실행에서는 그 칸이 **아예 없다**」.
  // 접기를 null 체크 바깥에 두면 내용 없는 `<summary>` 한 줄이 남아 이 규칙이 깨진다
  it('첫 실행에서는 견줌이 아예 없다 — 빈 접기 줄도 없다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    vi.spyOn(api, 'run').mockResolvedValue({ ...실행, status: 'FINISHED', items: [], evidence: [] });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 상자안 />);
    await screen.findAllByText(/만들기$/);

    expect(screen.queryByText(/직전 실행과 비교/)).toBeNull();
    expect(document.querySelector('details')).toBeNull();
  });
});

describe('상자 안에서는 제목 아래 전부가 한 스크롤 칸이다 (SPEC §8.3 · §8.7, 2026-10-08)', () => {
  it('상자안 이면 머리 · 요약 띠 · 본문이 모두 .rows-scroll 안에 있다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue({ ...실행, status: 'FINISHED', items: [], evidence: [] });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 상자안 />);

    await screen.findAllByText(/만들기$/);

    const 면 = document.querySelector('.screen');
    expect(면?.classList.contains('modal-results')).toBe(true);
    expect(면?.children).toHaveLength(1);
    const 스크롤칸 = 면?.firstElementChild;
    expect(스크롤칸?.classList.contains('rows-scroll')).toBe(true);
    expect(스크롤칸?.querySelector('.box-head')).not.toBeNull();
    expect(스크롤칸?.querySelector('.rs')).not.toBeNull();
    expect(스크롤칸?.querySelector('.toolbar')).not.toBeNull();
  });

  it('상자안 이 아니면(화면 전체) 스크롤칸을 따로 두지 않는다 — 페이지가 그대로 스크롤한다', async () => {
    그리기('FINISHED');
    await screen.findAllByText(/만들기$/);

    const 면 = document.querySelector('.screen');
    expect(면?.classList.contains('modal-results')).toBe(false);
    expect(면?.querySelector('.rows-scroll')).toBeNull();
  });
});

describe('RunResult 화면 머리 (2026-09-22)', () => {
  it('RUN 번호가 h1 이고 본문 면 바깥에 선다', async () => {
    const { container } = 그리기('FINISHED');
    await screen.findByText(/RUN/);

    const 머리 = container.querySelector('.head');
    expect(머리?.querySelector('h1')?.textContent).toContain('RUN');
    expect(container.querySelector('.screen .head')).toBeNull();
  });

  it('머리 부제에 대상 서버가 그대로 있다', async () => {
    const { container } = 그리기('FINISHED');
    await screen.findByText(/RUN/);

    // 그날 실제로 친 주소가 증적의 전제다 (SPEC §8.3)
    expect(container.querySelector('.head')?.textContent).toContain('대상 서버');
  });
});

// 버튼은 띠에서 고른 서비스가 아니라 **그 실행의 서비스** 칸을 본다.
// 띠가 회원(실행 읽기)인 채로 결제 실행 주소를 열면 결제 칸으로 가른다 (화면공통 §8)
describe('실행 결과의 권한은 그 실행의 서비스로', () => {
  const 김: User = {
    username: 'kim', displayName: '김철수', role: 'member', dashboard: 'read', mustChangePassword: false,
    services: [
      { id: 1, prefix: 'PAY', name: '결제', color: '#000000', envs: [], hasSlackWebhook: false, permissions: { cases: 'read', runs: 'write', authoring: 'none' } },
      { id: 2, prefix: 'MEM', name: '회원', color: '#000000', envs: [], hasSlackWebhook: false, permissions: { cases: 'read', runs: 'read', authoring: 'none' } },
    ],
  };

  function 항목(tcId: string) {
    return {
      historyId: 1, tcId, tcName: tcId, platform: 'desktop' as const, attempt: 1, params: {}, paramSchema: {},
      status: 'PASS' as const, durationMs: 1, error: null, startedAt: '2026-09-15T17:13:00.000Z', finishedAt: null,
    };
  }

  function 연다(tcId: string, status: string) {
    vi.spyOn(api, 'run').mockResolvedValue({ ...실행, status, items: [항목(tcId)], evidence: [] });
    vi.spyOn(api, 'progress').mockResolvedValue({ items: [] });
    render(<RunResult runId={RUN_ID} 판정하기={(접두사) => 판정을만든다(김, 접두사)} 상자안 />);
  }

  it('실행 쓰기인 서비스의 실행이면 중단 버튼이 선다', async () => {
    연다('PAY-001', 'RUNNING');
    expect(await screen.findByText('실행 중단')).toBeTruthy();
  });

  it('실행 읽기인 서비스의 실행이면 중단 버튼이 없다', async () => {
    연다('MEM-001', 'RUNNING');
    await screen.findAllByText(/대상 서버/);
    expect(screen.queryByText('실행 중단')).toBeNull();
  });

  it('증적 만들기도 그 실행의 서비스로 가른다', async () => {
    연다('PAY-001', 'FINISHED');
    expect(await screen.findByText('PDF 만들기')).toBeTruthy();
    cleanup();
    연다('MEM-001', 'FINISHED');
    await screen.findAllByText(/대상 서버/);
    expect(screen.queryByText('PDF 만들기')).toBeNull();
  });
});

describe('시나리오 실행 번호면 E2E 결과 화면으로 갈아탄다', () => {
  const 시나리오답 = {
    scenarioId: 12, version: 3, status: 'FINISHED', platform: 'desktop' as const, title: '결제 시나리오',
    env: 'qa', baseUrl: 'https://qa.example.com', triggeredBy: 'kim', triggeredByName: '김철수',
    startedAt: '2026-09-15T17:13:00.000Z', finishedAt: '2026-09-15T17:25:00.000Z', parts: [],
  };

  it.each([false, true])('상자안=%s', async (상자안) => {
    vi.spyOn(api, 'run').mockRejectedValue(new ApiError(404, 'SCENARIO_RUN', ''));
    const 부름 = vi.spyOn(scenarioApi, 'result').mockResolvedValue(시나리오답);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 상자안={상자안} />);

    expect(await screen.findByText('단계별 결과')).toBeTruthy();
    expect(부름).toHaveBeenCalledWith(RUN_ID);
  });
});

// 판정 칸과 디바이스 칩은 그 실행에 든 디바이스를 따른다 (도메인/실행 §8.3)
describe('디바이스 칸은 그 실행에 든 디바이스로 정한다 (도메인/실행 §8.3)', () => {
  type 기기 = 'desktop' | 'mobile' | 'android';

  function 줄(tcId: string, platform: 기기) {
    return {
      historyId: 1, tcId, tcName: tcId, platform, attempt: 1, params: {}, paramSchema: {},
      status: 'PASS' as const, durationMs: 1, error: null, startedAt: '2026-09-15T17:13:00.000Z', finishedAt: null,
    };
  }

  async function 본다(platforms: 기기[]) {
    vi.spyOn(api, 'run').mockResolvedValue({
      ...실행, status: 'FINISHED', items: platforms.map((p, i) => 줄(`PAY-00${i + 1}`, p)), evidence: [],
    });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await screen.findAllByText('PAY-001');
    return {
      칸: [...new Set([...document.querySelectorAll('.device-name')].map((el) => el.textContent))],
      칩: [...document.querySelectorAll('button.chip')].map((el) => el.textContent),
    };
  }

  it('브라우저 항목만 있으면 PC · 모바일 두 칸이다 — 한쪽만 돌았어도 둘 다 둔다', async () => {
    const { 칸, 칩 } = await 본다(['desktop']);
    expect(칸).toEqual(['PC', '모바일']);
    expect(칩).toContain('PC');
    expect(칩).toContain('모바일');
    expect(칩).not.toContain('Android 앱');
  });

  it('Android 앱 항목만 있으면 칸 하나이고 PC · 모바일 칸과 칩이 없다', async () => {
    const { 칸, 칩 } = await 본다(['android']);
    expect(칸).toEqual(['Android 앱']);
    expect(칩).toContain('Android 앱');
    expect(칩).not.toContain('PC');
    expect(칩).not.toContain('모바일');
  });

  it('둘이 섞이면 PC · 모바일 · Android 앱 차례로 셋이다', async () => {
    const { 칸, 칩 } = await 본다(['desktop', 'android']);
    expect(칸).toEqual(['PC', '모바일', 'Android 앱']);
    expect(칩.filter((글) => 글 === 'PC' || 글 === '모바일' || 글 === 'Android 앱')).toEqual(['PC', '모바일', 'Android 앱']);
  });
});

// 끝난 실행은 요약 띠 → 실패 카드 → 통과 · 미실행 줄 → 미확정 묶음이고 옆 칸이 따라온다 (도메인/실행 §8.3, 2026-10-08)
describe('결과 화면 조립 — 요약 띠 · 카드 · 줄 · 미확정 묶음 · 옆 칸', () => {
  function 항목줄(historyId: number, tcId: string, platform: Platform, status: ItemStatus, 미확정?: string): RunItemSummary {
    return {
      historyId, tcId, tcName: `이름-${tcId}`, platform, attempt: 1, params: {}, paramSchema: {},
      status, durationMs: 1200, error: null, startedAt: '2026-09-15T17:13:00.000Z',
      finishedAt: '2026-09-15T17:14:00.000Z', unconfirmed: 미확정 ?? null,
    };
  }

  function 카드응답(tcId: string, platform: Platform = 'desktop'): FailureCase {
    return {
      tcId,
      tcName: `이름-${tcId}`,
      devices: [{
        platform, change: null, streak: null, recent: ['FAIL'], attempts: 1, failedAttempts: 1,
        item: {
          historyId: 900, runId: RUN_ID, runTitle: '결제 회귀', tcId, tcName: `이름-${tcId}`, platform, attempt: 1,
          params: {}, paramSchema: {}, status: 'FAIL', durationMs: 1000, error: null,
          startedAt: '2026-09-15T17:13:00.000Z', finishedAt: '2026-09-15T17:14:00.000Z',
          precondition: [], expected: {}, expectedSchema: {}, steps: [],
        },
      }],
    };
  }

  function 끝난실행(items: RunItemSummary[], 증적들: EvidenceRow[] = []) {
    const 확정 = items.filter((i) => typeof i.unconfirmed !== 'string');
    const 미 = items.filter((i) => typeof i.unconfirmed === 'string');
    const 셈 = (목록: RunItemSummary[], s: ItemStatus) => 목록.filter((i) => i.status === s).length;
    return {
      ...실행,
      kind: 'FN' as const,
      status: 'FINISHED',
      counts: {
        total: items.length, pass: 셈(확정, 'PASS'), fail: 셈(확정, 'FAIL'), na: 셈(확정, 'NA'), running: 0,
        unconfirmed: { total: 미.length, pass: 셈(미, 'PASS'), fail: 셈(미, 'FAIL'), na: 셈(미, 'NA') },
      },
      items,
      evidence: 증적들,
    };
  }

  const 첫실행: 비교값 = { previous: null, 주소바뀜: false, 빠진건수: 0, 케이스들: [], 실패덩어리들: [] };
  const 견줌: 비교값 = {
    previous: { runId: 2110, startedAt: '2026-09-14T10:00:00.000Z' },
    주소바뀜: false,
    빠진건수: 0,
    케이스들: [
      { tcId: 'ZRR-001', tcName: '이름-ZRR-001', platform: 'desktop', 판정: '새로깨짐' },
      { tcId: 'ZRR-009', tcName: '이름-ZRR-009', platform: 'mobile', 판정: '고쳐짐' },
    ],
    실패덩어리들: [{
      대표문장: '가입 완료 안내가 안 보인다',
      건수: 2,
      항목들: [
        { historyId: 1, tcId: 'ZRR-001', tcName: '이름-ZRR-001', platform: 'desktop' },
        { historyId: 2, tcId: 'ZRR-001', tcName: '이름-ZRR-001', platform: 'mobile' },
      ],
    }],
  };

  const 앞선가 = (앞: Element | null, 뒤: Element | null) =>
    앞 !== null && 뒤 !== null && (앞.compareDocumentPosition(뒤) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

  const 판정칸 = (이름: string) =>
    [...document.querySelectorAll('.rs-fbtn')].find((b) => b.textContent?.startsWith(이름)) as HTMLElement;

  const 섞인항목 = [
    항목줄(1, 'ZRR-001', 'desktop', 'FAIL'),
    항목줄(2, 'ZRR-001', 'mobile', 'PASS'),
    항목줄(3, 'ZRR-002', 'desktop', 'PASS'),
    항목줄(4, 'ZRR-003', 'desktop', 'NA'),
    항목줄(5, 'ZRR-004', 'desktop', 'PASS', '기획서에 값이 없습니다'),
    항목줄(6, 'ZRR-005', 'desktop', 'FAIL'),
    항목줄(7, 'ZRR-005', 'mobile', 'FAIL', '기획서에 값이 없습니다'),
  ];

  function 연다(items: RunItemSummary[], 인사이트: 비교값 = 첫실행, 상자안 = false, 증적들: EvidenceRow[] = []) {
    vi.spyOn(api, 'run').mockResolvedValue(끝난실행(items, 증적들));
    vi.spyOn(api, 'insights').mockResolvedValue(인사이트);
    const 실패부름 = vi.spyOn(api, 'failures').mockResolvedValue({
      items: [카드응답('ZRR-001'), 카드응답('ZRR-005')], total: 2, page: 1, pageSize: 5,
    });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 상자안={상자안} />);
    return 실패부름;
  }

  it('요약 띠 → 실패 카드 → 통과 · 미실행 줄 → 미확정 묶음 차례다', async () => {
    연다(섞인항목, 견줌);
    await screen.findByText('이름-ZRR-002');

    const 띠 = document.querySelector('.rs');
    const 카드 = await waitFor(() => {
      const 목록 = document.querySelector('.fc-list');
      expect(목록).not.toBeNull();
      return 목록;
    });
    const 줄 = document.querySelector('.rr-rows .result-row');
    const 미확정 = document.querySelector('.rr-unconf');
    expect(앞선가(띠, 카드)).toBe(true);
    expect(앞선가(카드, 줄)).toBe(true);
    expect(앞선가(줄, 미확정)).toBe(true);
    expect(미확정?.textContent).toContain('이름-ZRR-004');
    expect(미확정?.textContent).toContain('기획서에 값이 없습니다');
  });

  it('미확정 묶음 줄은 거터를 판정 색이 아닌 중립으로 그린다', async () => {
    연다(섞인항목, 견줌);
    await screen.findByText('이름-ZRR-002');

    const 거터 = document.querySelector('.rr-unconf .gutter')?.getAttribute('style') ?? '';
    expect(거터).toContain('var(--line-2)');
  });

  it('도는 실행은 카드 통로도 견주기 통로도 부르지 않고 진행 집계와 줄 목록을 그린다', async () => {
    const 견줌부름 = vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    const 실패부름 = vi.spyOn(api, 'failures');
    vi.spyOn(api, 'progress').mockResolvedValue({ items: [] });
    vi.spyOn(api, 'run').mockResolvedValue({
      ...도는중응답, items: [항목줄(1, 'ZRR-001', 'desktop', 'PASS')],
    });
    const { container } = render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await screen.findByText('이름-ZRR-001');
    expect(실패부름).not.toHaveBeenCalled();
    expect(견줌부름).not.toHaveBeenCalled();
    expect(container.querySelector('.rs')).toBeNull();
    expect(container.querySelector('.tally')?.textContent).toContain('통과');
    expect(screen.getByText('실행 중단')).toBeTruthy();
  });

  it('실패가 0건이면 카드 통로를 부르지 않고 한 줄만 적는다', async () => {
    const 실패부름 = 연다([항목줄(1, 'ZRR-002', 'desktop', 'PASS')]);

    expect(await screen.findByText('실패한 케이스가 없습니다')).toBeTruthy();
    expect(실패부름).not.toHaveBeenCalled();
  });

  it('판정별 보기 「실패」는 카드만, 「통과」는 줄만 그린다', async () => {
    연다(섞인항목);
    await screen.findByText('이름-ZRR-002');
    await waitFor(() => expect(document.querySelector('.fc-list')).not.toBeNull());

    fireEvent.click(판정칸('실패'));
    expect(document.querySelector('.fc-list')).not.toBeNull();
    expect(document.querySelector('.rr-rows')).toBeNull();
    expect(document.querySelector('.rr-unconf')).toBeNull();

    fireEvent.click(판정칸('통과'));
    expect(document.querySelector('.fc-list')).toBeNull();
    expect(document.querySelector('.rr-unconf')).toBeNull();
    expect([...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent)).toEqual(['ZRR-002']);

    fireEvent.click(판정칸('미실행'));
    expect([...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent)).toEqual(['ZRR-003']);
  });

  it('PC 실패 · 모바일 통과 케이스는 카드에만 있고 줄 목록에 또 나오지 않는다', async () => {
    연다(섞인항목);
    await waitFor(() => expect(document.querySelector('.fc-list')).not.toBeNull());

    const 줄들 = [...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent);
    expect(줄들).toEqual(['ZRR-002', 'ZRR-003']);
    expect(document.querySelector('.fc-list')?.textContent).toContain('이름-ZRR-001');
  });

  it('확정 실패 + 미확정 실패 케이스는 카드와 미확정 묶음에 나뉜다', async () => {
    연다(섞인항목);
    await waitFor(() => expect(document.querySelector('.fc-list')?.textContent).toContain('이름-ZRR-005'));

    expect([...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent)).not.toContain('ZRR-005');
    const 묶음 = [...document.querySelectorAll('.rr-unconf .tcid')].map((el) => el.textContent);
    expect(묶음).toEqual(['ZRR-004', 'ZRR-005']);
  });

  it('디바이스 칩은 카드 통로에도 걸린다', async () => {
    const 실패부름 = 연다(섞인항목);
    await waitFor(() => expect(실패부름).toHaveBeenCalledWith(RUN_ID, 1, undefined));

    fireEvent.click(screen.getByRole('button', { name: '모바일' }));
    await waitFor(() => expect(실패부름).toHaveBeenLastCalledWith(RUN_ID, 1, 'mobile'));
  });

  it('옆 칸에 실행 정보 · 같은 사유로 실패 · 해결 · 증적 문서가 선다', async () => {
    연다(섞인항목, 견줌, false, [증적('PDF', 'READY')]);
    const 옆 = await waitFor(() => {
      const 칸 = document.querySelector('.rr-side');
      expect(칸?.textContent).toContain('가입 완료 안내가 안 보인다');
      return 칸!;
    });

    const 글 = 옆.textContent ?? '';
    for (const 조각 of [
      '실행 정보', '결제', '기능 테스트', 'qa', 'https://qa-pay.example.com', '김철수', 'PC, 모바일', 'RUN 2110',
      '같은 사유로 실패', '실패 항목 2건', '해결', '이름-ZRR-009', '증적 문서', '만듦',
    ]) {
      expect(글, 조각).toContain(조각);
    }
  });

  it('견줄 앞이 없으면 비교 기준 · 해결 · 같은 사유 칸이 없다', async () => {
    연다(섞인항목);
    const 옆 = await waitFor(() => {
      const 칸 = document.querySelector('.rr-side');
      expect(칸?.textContent).toContain('실행 정보');
      return 칸!;
    });

    expect(옆.textContent).not.toContain('비교 기준');
    expect(옆.textContent).not.toContain('해결');
    expect(옆.textContent).not.toContain('같은 사유로 실패');
  });

  it('상자 안에서는 옆 칸이 접힌 줄 하나이고 실행 정보는 그리지 않는다', async () => {
    연다(섞인항목, 견줌, true);
    const 접기 = await waitFor(() => {
      const 칸 = document.querySelector('.rr-side details');
      expect(칸).not.toBeNull();
      return 칸!;
    });

    expect(document.querySelectorAll('.rr-side details')).toHaveLength(1);
    expect(접기.hasAttribute('open')).toBe(false);
    expect(접기.querySelector('summary')?.textContent).toBe('같은 사유로 실패 1묶음 · 해결 1');
    expect(document.querySelector('.rr-side dl')).toBeNull();
    expect(앞선가(document.querySelector('.rs'), document.querySelector('.rr-side'))).toBe(true);
    expect(document.querySelector('.rows-scroll .rr-side')).not.toBeNull();
  });
});
