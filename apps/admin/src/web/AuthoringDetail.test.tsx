// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringRow } from './api.js';
import { AuthoringDetail } from './AuthoringDetail.js';
import type { 판정 } from './role.js';

// 옛 등급 셋의 판정을 그대로 옮긴 것 — 운영은 전부, 실행까지는 머지·설정 빼고, 보기만은 받기뿐
const 운영: 판정 = () => true;
const 실행까지: 판정 = (무엇) => 무엇 !== '작성머지' && 무엇 !== '설정';
const 보기만: 판정 = (무엇) => 무엇 === '증적받기';

let 답: AuthoringRow;
let 부른횟수 = 0;
const { 멈춤, 폐기, 다시 } = vi.hoisted(() => ({
  멈춤: vi.fn((_s: string, _id: number) => Promise.resolve({ status: 'RUNNING' as const })),
  폐기: vi.fn((_s: string, _id: number) => Promise.resolve({ ok: true as const })),
  다시: vi.fn((_s: string, _body: unknown) => Promise.resolve({ id: 9 })),
}));

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      authoringRequest: () => {
        부른횟수 += 1;
        return Promise.resolve(답);
      },
      createAuthoringMerge: () => Promise.resolve({ id: 2 }),
      stopAuthoring: 멈춤,
      discardAuthoring: 폐기,
      createAuthoringRequest: 다시,
      authoringAssetUrl: 진짜.api.authoringAssetUrl,
    },
  };
});

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 7,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'DONE',
    stage: '끝',
    stageAt: new Date().toISOString(),
    requestedByName: '테스터',
    claimedBy: '맥',
    prUrl: 'https://github.com/x/y/pull/3',
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...덮을것,
  };
}

/**
 * 첫 읽기가 **화면에 반영될 때까지** 기다린다. 그래야 주기 타이머가 걸린다.
 * 0 을 한 번만 흘리면 결과가 아직 안 붙어 타이머가 안 걸리고, 그러면 「다시 안 읽는다」 검사가
 * 아무것도 안 보고 통과한다 — 앞 검사가 데워 둔 순서에서만 맞던 모양이었다 (2026-09-23 실측)
 */
async function 첫읽기끝(): Promise<void> {
  await vi.waitFor(() => {
    if (screen.queryByText('불러오는 중입니다.') !== null) throw new Error('아직 첫 읽기 전');
  });
}

beforeEach(() => {
  부른횟수 = 0;
  멈춤.mockClear();
  폐기.mockClear();
  다시.mockClear();
  window.location.hash = '';
  답 = 줄({});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('작성 한 건 상세', () => {
  it('운영 계정에게만 반영 버튼이 보인다', async () => {
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);
    expect(await screen.findByRole('button', { name: '테스트 반영하기' })).toBeTruthy();
  });

  it('실행 등급에게는 반영 버튼 대신 누가 하는지 알린다. 반영은 저장소를 영구히 바꾼다', async () => {
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    await screen.findByText('테스터');
    expect(screen.queryByRole('button', { name: '테스트 반영하기' })).toBeNull();
    expect(screen.getByText('반영은 운영 권한이 있는 사람이 합니다.')).toBeTruthy();
  });

  it('아직 안 끝난 요청에는 반영 버튼이 없고 할 일이 없다고 말한다', async () => {
    답 = 줄({ status: 'RUNNING', prUrl: null, finishedAt: null });
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);
    await screen.findByText('테스터');
    expect(screen.queryByRole('button', { name: '테스트 반영하기' })).toBeNull();
    expect(screen.getByText(/^지금은 없습니다/)).toBeTruthy();
  });

  it('완료면 다음 단계에 만든 테스트 코드(PR) 링크가 있다', async () => {
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    const 링크 = await screen.findByRole('link', { name: '만든 테스트 코드 보기 (PR)' });
    expect(링크.getAttribute('href')).toBe('https://github.com/x/y/pull/3');
  });

  it('반영하기를 누르면 머지 요청을 세우고 새 줄로 간다', async () => {
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);
    fireEvent.click(await screen.findByRole('button', { name: '테스트 반영하기' }));
    await vi.waitFor(() => expect(window.location.hash).toBe('#/authoring/2'));
  });

  it('끝난 요청은 다시 읽지 않는다. 안 멈추면 탭 하나가 서버를 계속 두드린다', async () => {
    vi.useFakeTimers();
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);
    await 첫읽기끝();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(부른횟수).toBe(1);
  });

  it('준비 중(DRAFT) 요청도 다시 읽지 않는다. 스스로 바뀌지 않고 버려진 채 남는다', async () => {
    답 = 줄({ status: 'DRAFT', prUrl: null, finishedAt: null, startedAt: null, assets: [] });
    vi.useFakeTimers();
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);
    await 첫읽기끝();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(부른횟수).toBe(1);
  });

  it('도는 중이면 주기적으로 다시 읽는다', async () => {
    답 = 줄({ status: 'RUNNING', prUrl: null, finishedAt: null });
    vi.useFakeTimers();
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);
    await 첫읽기끝();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(부른횟수).toBeGreaterThan(1);
  });

  it('자료를 순서대로 보인다. 파일은 내려받기 링크, 피그마는 저장된 주소로 새 창에 연다', async () => {
    답 = 줄({
      assets: [
        { id: 11, position: 1, kind: 'FILE', name: '결제 기획서.pdf', figmaUrl: null, size: 10 },
        { id: 12, position: 2, kind: 'FILE', name: '화면정의서.docx', figmaUrl: null, size: 20 },
        {
          id: 13,
          position: 3,
          kind: 'FIGMA',
          name: 'https://www.figma.com/design/AbC/?node-id=12-34',
          figmaUrl: 'https://www.figma.com/design/AbC/?node-id=12-34',
          size: null,
        },
      ],
    });
    render(<AuthoringDetail service="PAY" id={7} 할수={보기만} />);

    const 첫 = await screen.findByRole('link', { name: '결제 기획서.pdf' });
    const 링크들 = screen.getAllByRole('link').filter((a) => a.closest('.authoring-assets') !== null);
    expect(링크들.map((a) => a.textContent)).toEqual([
      '결제 기획서.pdf',
      '화면정의서.docx',
      'https://www.figma.com/design/AbC/?node-id=12-34',
    ]);
    expect(첫.getAttribute('href')).toBe('/api/authoring/requests/7/assets/11');
    expect(첫.hasAttribute('download')).toBe(true);
    const 피그마 = 링크들[2];
    expect(피그마?.getAttribute('href')).toBe('https://www.figma.com/design/AbC/?node-id=12-34');
    expect(피그마?.getAttribute('target')).toBe('_blank');
    expect(피그마?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('준비 중(DRAFT) 요청에는 줄에 서지 않았으니 폐기하고 새 요청으로 다시 넣으라고 알린다', async () => {
    답 = 줄({ status: 'DRAFT', prUrl: null, finishedAt: null, startedAt: null, assets: [] });
    render(<AuthoringDetail service="PAY" id={7} 할수={운영} />);
    expect(await screen.findByText('이 요청은 줄에 서지 않았습니다. 폐기하고 새 요청으로 다시 넣으세요')).toBeTruthy();
    expect(screen.getByText('자료 올리는 중')).toBeTruthy();
  });
});

const 도는진척 = {
  childRunning: true,
  elapsedSec: 12 * 60 + 30,
  limitSec: 3600,
  caseFiles: 3,
  tokens: 1234567,
  screens: 4,
  lastAction: '케이스 파일을 쓰는 중',
  lastActionAt: new Date(Date.now() - 5000).toISOString(),
};

describe('작성 진척 · 중단 · 폐기', () => {
  it('도는 중이면 Status 카드가 진척 · 숫자 칸 · 방금 한 일을 보인다', async () => {
    답 = 줄({ status: 'RUNNING', stage: '케이스를 만드는 중', prUrl: null, finishedAt: null, progress: 도는진척, canStop: true });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    expect(await screen.findByText('3단계 진행 중 · 40%')).toBeTruthy();
    expect(screen.getByText('4장')).toBeTruthy();
    expect(screen.getByText('3개')).toBeTruthy();
    expect(screen.getByText('1.2M')).toBeTruthy();
    expect(screen.getByText('케이스 파일을 쓰는 중')).toBeTruthy();
  });

  it('진척이 없으면 자식 전이다 — 올리는 중이라고 하지 않는다', async () => {
    답 = 줄({ status: 'RUNNING', prUrl: null, finishedAt: null, progress: null });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    await screen.findByText('테스터');
    expect(screen.queryByText('올리는 중 — 멈출 수 없습니다')).toBeNull();
  });

  it('칸이 덜 찬 진척(childRunning 뿐)이어도 죽지 않는다', async () => {
    답 = 줄({ status: 'RUNNING', prUrl: null, finishedAt: null, progress: { childRunning: false } as AuthoringRow['progress'] });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    expect(await screen.findByText('테스터')).toBeTruthy();
  });

  it('작성 중단은 한 번 더 묻고, 예를 누르면 멈춤을 보낸다', async () => {
    답 = 줄({ status: 'RUNNING', prUrl: null, finishedAt: null, progress: 도는진척, canStop: true });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    fireEvent.click(await screen.findByRole('button', { name: '작성 중단' }));
    const 상자 = screen.getByRole('dialog');
    expect(상자.textContent).toContain('12분 동안 만든 것은 남겨 두어 나중에 이어서 작성할 수 있습니다.');
    expect(멈춤).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: '작성 중단' }).at(-1)!);
    await vi.waitFor(() => expect(멈춤).toHaveBeenCalledWith('PAY', 7));
  });

  it('canStop 이 아니면 중단 버튼이 없다 — 요청한 사람도 admin 도 아니면 서버가 false 를 준다', async () => {
    답 = 줄({ status: 'RUNNING', prUrl: null, finishedAt: null, progress: 도는진척, canStop: false, canDiscard: false });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    await screen.findByText('테스터');
    expect(screen.queryByRole('button', { name: '작성 중단' })).toBeNull();
    expect(screen.queryByRole('button', { name: '폐기' })).toBeNull();
  });

  it('멈춤 요청 뒤에는 중단하는 중이라고 보이고 계속 다시 읽는다', async () => {
    답 = 줄({
      status: 'RUNNING', prUrl: null, finishedAt: null, progress: 도는진척, canStop: false,
      stopRequestedAt: new Date().toISOString(),
    });
    vi.useFakeTimers();
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    await 첫읽기끝();
    expect(screen.getByText(/^중단하는 중/)).toBeTruthy();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(부른횟수).toBeGreaterThan(1);
  });

  it('자식이 끝나 올리는 중이면 멈출 수 없다고 말한다', async () => {
    답 = 줄({ status: 'RUNNING', prUrl: null, finishedAt: null, progress: { ...도는진척, childRunning: false }, canStop: false });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    expect(await screen.findByText('올리는 중 — 멈출 수 없습니다')).toBeTruthy();
  });

  it('중단된 것은 누가 왜 멈췄는지 보이고 다시 읽지 않는다', async () => {
    답 = 줄({ status: 'STOPPED', prUrl: null, stopReason: 'USER', stoppedBy: 'kim', stoppedByName: '김철수', canDiscard: true });
    vi.useFakeTimers();
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    await 첫읽기끝();
    expect(screen.getByText('김철수 · 사용자가 멈춤')).toBeTruthy();
    expect(screen.getByText('중단')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(부른횟수).toBe(1);
  });

  it('시스템이 멈춘 것은 시스템이라고 적는다', async () => {
    답 = 줄({ status: 'STOPPED', prUrl: null, stopReason: 'TIMEOUT', stoppedBy: 'system', stoppedByName: null });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    expect(await screen.findByText('시스템 · 시간초과')).toBeTruthy();
  });

  it('실패한 정방향 작성은 같은 자료로 다시 작성하면 재실행 줄을 세우고 새 줄로 간다', async () => {
    답 = 줄({ status: 'FAILED', prUrl: null, error: '실패함', canDiscard: true });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    fireEvent.click(await screen.findByRole('button', { name: '같은 자료로 다시 작성' }));
    await vi.waitFor(() => expect(window.location.hash).toBe('#/authoring/9'));
    expect(다시).toHaveBeenCalledWith('PAY', { kind: 'RERUN', sourceId: 7 });
  });

  it('재실행한 요청이 실패하면 같은 자료로 다시 작성은 맨 처음 요청으로 보낸다 — 자료는 거기 있다', async () => {
    답 = 줄({ kind: 'RERUN', sourceId: 3, status: 'FAILED', prUrl: null, error: '실패함', canDiscard: true });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    fireEvent.click(await screen.findByRole('button', { name: '같은 자료로 다시 작성' }));
    await vi.waitFor(() => expect(다시).toHaveBeenCalledWith('PAY', { kind: 'RERUN', sourceId: 3 }));
  });

  describe('중단 — 다음 단계 카드', () => {
    const 멈춤 = (덮을것: Partial<AuthoringRow>) =>
      줄({
        status: 'STOPPED',
        prUrl: null,
        stopReason: 'TIMEOUT',
        stoppedBy: 'system',
        canDiscard: true,
        progress: { ...도는진척, childRunning: false, caseFiles: 12 },
        ...덮을것,
      });

    it('제목은 다음 단계이고 이어서 작성 · 같은 자료로 다시 작성 · 폐기를 차례로 낸다', async () => {
      답 = 멈춤({ canResume: true, resumeUntil: '2026-10-05T03:00:00.000Z' });
      render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
      const 카드 = await screen.findByRole('region', { name: '다음 단계' });
      expect(카드.querySelector('h3')?.textContent).toBe('다음 단계');
      expect(카드.textContent).toContain(
        '중단된 자리의 테스트 12개를 이어받아 남은 작업을 이어서 합니다. 10월 5일까지 이어갈 수 있습니다.',
      );
      const 버튼들 = Array.from(카드.querySelectorAll('button')).map((b) => b.textContent);
      expect(버튼들).toEqual(['이어서 작성', '같은 자료로 다시 작성', '폐기']);
      fireEvent.click(screen.getByRole('button', { name: '이어서 작성' }));
      await vi.waitFor(() => expect(다시).toHaveBeenCalledWith('PAY', { kind: 'RERUN', sourceId: 7, resume: true }));
      await vi.waitFor(() => expect(window.location.hash).toBe('#/authoring/9'));
    });

    it('만든 테스트를 모르면 수 없이 적는다', async () => {
      답 = 멈춤({ canResume: true, resumeUntil: '2026-10-05T03:00:00.000Z', progress: null });
      render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
      expect(
        await screen.findByText('중단된 자리부터 남은 작업을 이어서 합니다. 10월 5일까지 이어갈 수 있습니다.'),
      ).toBeTruthy();
    });

    it('이미 이어받았으면 버튼 대신 이어받은 요청으로 가는 길을 준다', async () => {
      답 = 멈춤({ canResume: false, resumedBy: 12 });
      render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
      const 고리 = await screen.findByRole('link', { name: '작성 요청 #12로 이어받았습니다' });
      expect(고리.getAttribute('href')).toBe('#/authoring/12');
      expect(screen.queryByRole('button', { name: '이어서 작성' })).toBeNull();
    });

    it('보관 기간이 지났으면 까닭을 적고 처음부터 다시만 남긴다', async () => {
      답 = 멈춤({ canResume: false, resumedBy: null });
      render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
      expect(await screen.findByText('보관 기간이 지나 만든 것을 지웠습니다. 처음부터 다시 작성하세요.')).toBeTruthy();
      expect(screen.queryByRole('button', { name: '이어서 작성' })).toBeNull();
      expect(screen.getByRole('button', { name: '같은 자료로 다시 작성' })).toBeTruthy();
    });

    it('올리기 거절이면 거절 까닭을 상태 카드에 보인다', async () => {
      답 = 멈춤({ stopReason: 'REJECTED', error: '올릴 것에 테스트 계정 비밀번호가 들어 있다 — 올리지 않는다', canResume: true });
      render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
      expect(await screen.findByText('시스템 · 올리기 거절')).toBeTruthy();
      expect(screen.getByText('올릴 것에 테스트 계정 비밀번호가 들어 있다 — 올리지 않는다')).toBeTruthy();
    });

    it('이어받은 요청은 어느 요청의 중단 자리에서 이어받았는지 적는다', async () => {
      답 = 줄({ kind: 'RERUN', sourceId: 3, resumeFrom: 5, status: 'RUNNING', prUrl: null, finishedAt: null });
      render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
      const 고리 = await screen.findByRole('link', { name: '작성 요청 #5의 중단 자리에서 이어받음' });
      expect(고리.getAttribute('href')).toBe('#/authoring/5');
    });
  });

  it('보기 등급에게는 다시 작성 버튼 대신 누가 하는지 알린다', async () => {
    답 = 줄({ status: 'FAILED', prUrl: null, error: '실패함' });
    render(<AuthoringDetail service="PAY" id={7} 할수={보기만} />);
    expect(await screen.findByText('다시 작성은 실행 권한이 있는 사람이 합니다.')).toBeTruthy();
  });

  it('화면과 대조한 요청도 같은 자료로 다시 작성하고, 대상 서버·시작 주소도 그대로라고 알린다', async () => {
    답 = 줄({ status: 'STOPPED', prUrl: null, compare: true, env: 'qa', stopReason: 'TIMEOUT', stoppedBy: 'system', canDiscard: true });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    expect(
      await screen.findByText(
        '넣었던 자료 그대로 새 요청을 만들어 처음부터 다시 돌립니다. 이 요청은 기록으로 남습니다. 대상 서버와 시작 주소도 원본 그대로 씁니다.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '같은 자료로 다시 작성' }));
    await vi.waitFor(() => expect(다시).toHaveBeenCalledWith('PAY', { kind: 'RERUN', sourceId: 7 }));
  });

  it('실패한 요청도 처음부터 다시 돌린다고 알린다 — 멈춘 자리부터 잇는 것이 아니다', async () => {
    답 = 줄({ status: 'FAILED', prUrl: null, error: '실패함', canDiscard: true });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    expect(
      await screen.findByText('원인을 먼저 고친 뒤 누르세요. 넣었던 자료 그대로 새 요청을 만들어 처음부터 다시 돌립니다.'),
    ).toBeTruthy();
  });

  it('대조한 재실행은 입력이 원본에 있어 화면만이 아니라 원본 요청의 자료로 대조한다고 적는다', async () => {
    답 = 줄({
      kind: 'RERUN',
      sourceId: 3,
      status: 'DONE',
      compare: true,
      env: 'qa',
      startUrl: null,
      assets: [{ id: 50, position: 1, kind: 'FILE', name: '기획서-표시.docx', figmaUrl: null, size: 10, role: 'MARKED', sourceAssetId: 11 }],
    });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    expect(await screen.findByText('입력은 원본 요청 #3 것을 그대로 씁니다')).toBeTruthy();
    expect(screen.queryByText('화면만 — 기획서 없이 이 화면을 훑습니다')).toBeNull();
    expect(screen.getByText('표시 사본 — 원본 요청 #3의 자료')).toBeTruthy();
  });

  it('폐기는 한 번 더 묻고, 성공하면 목록으로 간다', async () => {
    답 = 줄({ status: 'FAILED', prUrl: null, error: '실패함', canDiscard: true });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    fireEvent.click(await screen.findByRole('button', { name: '폐기' }));
    expect(screen.getByRole('dialog').textContent).toContain('목록에서 사라집니다. 통계와 토큰 기록은 남습니다.');
    fireEvent.click(screen.getAllByRole('button', { name: '폐기' }).at(-1)!);
    await vi.waitFor(() => expect(window.location.hash).toBe('#/authoring'));
    expect(폐기).toHaveBeenCalledWith('PAY', 7);
  });

  it('폐기된 행을 직접 열면 폐기됨이라고 보인다', async () => {
    답 = 줄({ status: 'STOPPED', prUrl: null, stopReason: 'USER', stoppedBy: 'kim', stoppedByName: '김철수', discardedAt: new Date().toISOString() });
    render(<AuthoringDetail service="PAY" id={7} 할수={실행까지} />);
    expect(await screen.findByText(/^폐기됨/)).toBeTruthy();
  });
});
