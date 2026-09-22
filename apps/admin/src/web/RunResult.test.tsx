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
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type EvidenceRow, type RunSummary } from './api.js';
import { RunResult } from './RunResult.js';

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
  return render(<RunResult runId={RUN_ID} role="operator" />);
}

describe('실행 결과 화면의 증적 버튼 (SPEC §8.4)', () => {
  it('끝난 실행에는 형식마다 만들기 버튼이 하나씩 뜬다', async () => {
    그리기('FINISHED');

    const 글들 = (await screen.findAllByText(/만들기$/)).map((el) => el.textContent);
    expect(글들).toEqual(['PDF 만들기', '엑셀 만들기', 'HTML 만들기']);
  });

  it('판정 숫자가 만들기 버튼보다 앞에 온다', async () => {
    그리기('FINISHED');

    await screen.findAllByText(/만들기$/);

    // 걸러내기 칩에도 `통과` 가 있다. 머리 띠 안에서만 본다
    const 머리띠 = document.querySelector('.tally');
    const 차례 = [...(머리띠?.children ?? [])].map((el) => (el.className === 'makebtns' ? '버튼들' : el.textContent));
    // 좁은 화면에서 접히면 뒤엣것이 아랫줄로 밀린다. 휴대폰에서 이 화면이 하는 일은 「끝났나 보기」다
    expect(차례.indexOf('버튼들')).toBeGreaterThan(차례.findIndex((it) => it?.includes('통과')));
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
    render(<RunResult runId={RUN_ID} role="operator" />);

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
    render(<RunResult runId={RUN_ID} role="operator" />);
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
    render(<RunResult runId={RUN_ID} role="operator" />);
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
    render(<RunResult runId={RUN_ID} role="operator" 상자안 />);
    await screen.findAllByText(/만들기$/);

    const 머리 = document.querySelector('.box-head');
    expect(머리?.textContent, '머리에 증적 문서 줄이 없다').toMatch(/만듦/);
    // 같은 말을 두 번 하지 않는다 — 머리에 올렸으면 본문에 블록으로 또 서지 않는다
    expect(document.querySelector('.screen .sec')).toBeNull();
  });

  it('화면 전체에서는 증적 문서가 지금처럼 블록으로 선다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    그리기('FINISHED', [증적('PDF', 'READY')]);
    await screen.findAllByText(/만들기$/);

    expect(document.querySelector('.box-head')).toBeNull();
    expect(document.querySelector('.screen .sec')?.textContent).toMatch(/만듦/);
  });

  it('견줌은 접힌 채로 뜬다 — 펴야 보인다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(견줌있음);
    vi.spyOn(api, 'run').mockResolvedValue({ ...실행, status: 'FINISHED', items: [], evidence: [] });
    render(<RunResult runId={RUN_ID} role="operator" 상자안 />);

    const 접기 = await screen.findByText(/직전 실행과 견줌/);
    const 상자 = 접기.closest('details');
    expect(상자, '견줌이 접기가 아니다').not.toBeNull();
    expect(상자?.hasAttribute('open'), '견줌이 펴진 채로 뜬다').toBe(false);
  });

  // SPEC 공통/7-데모와-완료 §7 — 「첫 실행에서는 그 칸이 **아예 없다**」.
  // 접기를 null 체크 바깥에 두면 내용 없는 `<summary>` 한 줄이 남아 이 규칙이 깨진다
  it('첫 실행에서는 견줌이 아예 없다 — 빈 접기 줄도 없다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    vi.spyOn(api, 'run').mockResolvedValue({ ...실행, status: 'FINISHED', items: [], evidence: [] });
    render(<RunResult runId={RUN_ID} role="operator" 상자안 />);
    await screen.findAllByText(/만들기$/);

    expect(screen.queryByText(/직전 실행과 견줌/)).toBeNull();
    expect(document.querySelector('details')).toBeNull();
  });
});

describe('상자 안에서는 케이스 줄만 스크롤한다 (SPEC §8.7, 2026-09-22 ②)', () => {
  it('상자안 이면 머리·필터는 밖에, 케이스 줄은 .rows-scroll 안에 있다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue({ ...실행, status: 'FINISHED', items: [], evidence: [] });
    render(<RunResult runId={RUN_ID} role="operator" 상자안 />);

    await screen.findAllByText(/만들기$/);

    const 면 = document.querySelector('.screen');
    expect(면?.classList.contains('modal-results')).toBe(true);
    const 스크롤칸 = 면?.querySelector('.rows-scroll');
    expect(스크롤칸).not.toBeNull();
    // 필터 줄은 스크롤칸 밖에 있다 — 스크롤해도 그대로 보여야 한다
    expect(면?.querySelector(':scope > .toolbar')).not.toBeNull();
    expect(스크롤칸?.querySelector('.toolbar')).toBeNull();
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
