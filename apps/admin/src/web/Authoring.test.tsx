// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringListRow } from './api.js';
import { Authoring } from './Authoring.js';
import { 멈춘듯기준 } from './authoringView.js';

const 줄들: AuthoringListRow[] = [];
const 부른쪽: number[] = [];
const 거른것: boolean[] = [];
const 읽기 = { 실패: false, 총건수: null as number | null };

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      authoringRequests: (_service: string, page: number, 할일만 = false) => {
        부른쪽.push(page);
        거른것.push(할일만);
        if (읽기.실패) return Promise.reject(new Error('목록을 못 읽었다'));
        return Promise.resolve({ items: 줄들, total: 읽기.총건수 ?? 줄들.length, page, pageSize: 50 });
      },
    },
  };
});

function 줄(덮을것: Partial<AuthoringListRow>): AuthoringListRow {
  return {
    id: 1,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'PENDING',
    stage: null,
    stageAt: null,
    requestedByName: '테스터',
    claimedBy: null,
    prUrl: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    assets: null,
    todo: { heldOpen: 0, conflictsOpen: 0, apply: null },
    ...덮을것,
  };
}

beforeEach(() => {
  줄들.length = 0;
  부른쪽.length = 0;
  거른것.length = 0;
  읽기.실패 = false;
  읽기.총건수 = null;
  window.history.replaceState(null, '', '#/authoring');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('작성 줄 목록', () => {
  it('줄이 하나도 없으면 왜 비었는지 말한다', async () => {
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('아직 작성을 요청한 기록이 없습니다')).toBeTruthy();
  });

  it('줄마다 요청자와 작업 단계가 보인다', async () => {
    줄들.push(줄({ status: 'RUNNING', stage: '케이스 2건째', stageAt: new Date().toISOString() }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText(/케이스 2건째/)).toBeTruthy();
    expect(screen.getByText(/테스터/)).toBeTruthy();
  });

  it('신호가 오래 끊긴 줄은 작성 중이 아니라 응답 없음으로 보인다', async () => {
    const 오래전 = new Date(Date.now() - 멈춘듯기준 - 1000).toISOString();
    줄들.push(줄({ status: 'RUNNING', stage: '관문 3', stageAt: 오래전 }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('응답 없음')).toBeTruthy();
    expect(screen.queryByText('작성 중')).toBeNull();
  });

  it('멈춘 줄은 중단으로 보인다', async () => {
    줄들.push(줄({ status: 'STOPPED', stopReason: 'USER', finishedAt: new Date().toISOString() }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('중단')).toBeTruthy();
  });

  it('여러 번 돈 요청은 뿌리 번호 한 줄 — 링크도 뿌리로 가고 몇 차인지 보인다 (도메인/작성 §7 「실행 기록」)', async () => {
    줄들.push(줄({ id: 5877, kind: 'RERUN', sourceId: 5873, resumeFrom: 5876, rootId: 5873, runCount: 5, status: 'RUNNING', stageAt: new Date().toISOString() }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('#5873')).toBeTruthy();
    expect(screen.queryByText('#5877')).toBeNull();
    const 고리 = screen.getAllByRole('link').find((a) => a.getAttribute('href')?.startsWith('#/authoring/'));
    expect(고리?.getAttribute('href')).toBe('#/authoring/5873');
    expect(screen.getByText(/5차 · 이어서/)).toBeTruthy();
  });
});

// 작성 읽기면 새 작성 자리가 아예 없다 (화면공통 §8)
describe('피그마 칸 잠금이 새 요청 폼까지 넘어간다', () => {
  it('피그마토큰={false} 면 피그마 칸이 잠긴다', async () => {
    render(<Authoring service="PAY" 피그마토큰={false} 할수={() => true} />);
    fireEvent.click(await screen.findByRole('button', { name: '새 작성' }));
    expect(screen.getByLabelText('피그마 주소') as HTMLTextAreaElement).toHaveProperty('disabled', true);
  });
});

describe('작성 권한 칸', () => {
  it('작성 쓰기면 「새 작성」을 눌러 오른쪽 서랍에서 폼을 연다 — 처음에는 목록만 보인다', async () => {
    render(<Authoring service="PAY" 할수={() => true} />);
    const 단추 = await screen.findByRole('button', { name: '새 작성' });
    expect(screen.queryByText('테스트 작성 시작')).toBeNull();
    fireEvent.click(단추);
    const 서랍 = screen.getByRole('complementary', { name: '새 작성 요청' });
    expect(within(서랍).getByText('테스트 작성 시작')).toBeTruthy();
    expect(단추.getAttribute('aria-expanded')).toBe('true');
  });

  it('서랍은 ✕ 와 Esc 로 닫힌다', async () => {
    render(<Authoring service="PAY" 할수={() => true} />);
    fireEvent.click(await screen.findByRole('button', { name: '새 작성' }));
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('complementary', { name: '새 작성 요청' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '새 작성' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: '새 작성 요청' })).toBeNull();
  });

  it('작성 읽기면 새 작성 단추도 폼도 없다', async () => {
    render(<Authoring service="PAY" 할수={(무엇) => 무엇 !== '작성요청'} />);
    await screen.findByText('아직 작성을 요청한 기록이 없습니다');
    expect(screen.queryByRole('button', { name: '새 작성' })).toBeNull();
    expect(screen.queryByText('테스트 작성 시작')).toBeNull();
    expect(screen.queryByText('PRD')).toBeNull();
  });

  it('작성 읽기면 빈 목록 안내가 못 하는 일을 권하지 않는다', async () => {
    render(<Authoring service="PAY" 할수={(무엇) => 무엇 !== '작성요청'} />);
    expect(await screen.findByText('작성 요청이 들어오면 여기에 줄이 생깁니다')).toBeTruthy();
    expect(screen.queryByText('기획서를 넣으면 여기에 줄이 생깁니다')).toBeNull();
  });

  it('남은 요구를 이어 작성한 요청 줄은 원본을 평문으로 적는다 — 줄 전체가 고리라 안에 고리를 두지 않는다', async () => {
    줄들.push(줄({ id: 5901, rootId: 5901, continueFrom: 5873, runCount: 1 }));
    줄들.push(줄({ id: 5910, rootId: 5902, continueFrom: 5877, kind: 'RERUN', runCount: 2 }));
    render(<Authoring service="PAY" 할수={() => true} />);
    const 첫 = await screen.findByText(/#5873의 남은 요구/);
    expect(첫.textContent).toContain('#5873의 남은 요구');
    expect(첫.closest('a')).toBe(null);
    expect(screen.getByText(/2차 · .* · #5877의 남은 요구/)).toBeTruthy();
  });

  it('대조 병합 뒤 서버가 세운 기획서에 없는 화면 요청 줄은 뿌리 번호와 함께 꼬리표를 단다', async () => {
    줄들.push(줄({ id: 5920, rootId: 5920, uncoveredOf: 5901, runCount: 1 }));
    render(<Authoring service="PAY" 할수={() => true} />);
    const 꼬리 = await screen.findByText(/#5901 다음 · 기획서에 없는 화면/);
    expect(꼬리.textContent).toContain('#5901 다음 · 기획서에 없는 화면');
    expect(꼬리.closest('a')).toBe(null);
  });
});

describe('작성 목록 쪽은 주소에 남는다 (점검 11.4)', () => {
  it('주소의 쪽으로 처음부터 부른다 — 상세에 갔다 뒤로 와도 그 쪽이다', async () => {
    window.history.replaceState(null, '', '#/authoring?page=3');
    render(<Authoring service="PAY" 할수={() => true} />);
    await screen.findByText('아직 작성을 요청한 기록이 없습니다');
    expect(부른쪽[0]).toBe(3);
    expect(window.location.hash).toBe('#/authoring?page=3');
  });

  it('건수가 50의 배수라 「다음」으로 간 빈 쪽에서도 쪽 넘기기가 남고 「기록이 없다」고 하지 않는다 (리뷰 L18)', async () => {
    읽기.총건수 = 50;
    window.history.replaceState(null, '', '#/authoring?page=2');
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('이 쪽에는 요청이 없습니다')).toBeTruthy();
    expect(screen.queryByText('아직 작성을 요청한 기록이 없습니다')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    await vi.waitFor(() => expect(부른쪽.at(-1)).toBe(1));
  });
});

describe('목록 다시 읽기가 실패해도 쓰던 새 요청은 남는다 (리뷰 L17)', () => {
  it('5초 다시 읽기가 한 번 실패하면 오류만 보이고 열어 둔 서랍 · 친 피그마 주소는 그대로다', async () => {
    줄들.push(줄({ id: 3 }));
    vi.useFakeTimers();
    render(<Authoring service="PAY" 할수={() => true} />);
    await vi.waitFor(() => screen.getByRole('button', { name: '새 작성' }));
    fireEvent.click(screen.getByRole('button', { name: '새 작성' }));
    const 칸 = within(screen.getByRole('complementary', { name: '새 작성 요청' })).getByPlaceholderText('한 줄에 하나씩');
    fireEvent.change(칸, { target: { value: 'https://www.figma.com/design/AbC/x' } });

    읽기.실패 = true;
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.waitFor(() => screen.getByText('목록을 못 읽었다'));
    const 남은칸 = within(screen.getByRole('complementary', { name: '새 작성 요청' })).getByPlaceholderText('한 줄에 하나씩');
    expect((남은칸 as HTMLTextAreaElement).value).toBe('https://www.figma.com/design/AbC/x');
  });

  it('다른 서비스로 바꾼 뒤 읽기가 실패하면 앞 서비스의 줄을 남기지 않는다', async () => {
    줄들.push(줄({ id: 3 }));
    const 그림 = render(<Authoring service="PAY" 할수={() => true} />);
    await screen.findByText('#3');
    읽기.실패 = true;
    그림.rerender(<Authoring service="MKT" 할수={() => true} />);
    await screen.findByText('목록을 못 읽었다');
    expect(screen.queryByText('#3')).toBeNull();
  });
});

describe('「PRD 에 없는 화면」에서 넘어오면 대조가 켜져 있다 (⑫ 점검 8.10)', () => {
  it('?compare=1 이면 서랍이 열린 채 「실제 화면과 대조」를 켜고 뜨고 주소에서는 그 조건이 정리된다', async () => {
    window.history.replaceState(null, '', '#/authoring?compare=1');
    render(<Authoring service="PAY" 할수={() => true} />);
    const 칸 = (await screen.findByLabelText('실제 화면과 대조')) as HTMLInputElement;
    expect(칸.checked).toBe(true);
    expect(window.location.hash).toBe('#/authoring');
  });

  it('?compare=1 로 열린 서랍을 닫았다 다시 열면 대조가 꺼져 있다 — 처음 한 번만 켠다', async () => {
    window.history.replaceState(null, '', '#/authoring?compare=1');
    render(<Authoring service="PAY" 할수={() => true} />);
    await screen.findByLabelText('실제 화면과 대조');
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    fireEvent.click(screen.getByRole('button', { name: '새 작성' }));
    expect((screen.getByLabelText('실제 화면과 대조') as HTMLInputElement).checked).toBe(false);
  });

  it('조건이 없으면 서랍을 열었을 때 꺼져 있다', async () => {
    render(<Authoring service="PAY" 할수={() => true} />);
    fireEvent.click(await screen.findByRole('button', { name: '새 작성' }));
    expect((screen.getByLabelText('실제 화면과 대조') as HTMLInputElement).checked).toBe(false);
  });
});

describe('작성 목록 줄 제목과 할 일 (⑫ 점검 11.1 · 11.2 · N2)', () => {
  it('줄 제목은 넣은 자료 이름이다 — 여럿이면 「외 N개」, 자료가 없는 화면만 대조는 그렇게 적는다', async () => {
    줄들.push(줄({ id: 6120, rootId: 6120, assets: { first: '회원가입 기획서.docx', more: 2 } }));
    줄들.push(줄({ id: 6121, rootId: 6121, compare: true }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect((await screen.findByText('회원가입 기획서.docx 외 2개')).getAttribute('href')).toBe('#/authoring/6120');
    expect(screen.getByText('화면만 — 기획서 없이 대조')).toBeTruthy();
  });

  it('사람 손이 남은 줄은 초록 완료 대신 할 일 칩을 단다', async () => {
    줄들.push(줄({ id: 7001, rootId: 7001, status: 'DONE', todo: { heldOpen: 3, conflictsOpen: 0, apply: 'WAITING' } }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('입력 필요 3')).toBeTruthy();
    expect(screen.getByText('반영 대기')).toBeTruthy();
    expect(screen.queryByText('완료')).toBeNull();
  });

  it('반영이 실패한 줄은 그냥 「실패」가 아니라 「반영 실패」다 — 상세와 같은 말', async () => {
    줄들.push(줄({ id: 5880, rootId: 5873, kind: 'MERGE', status: 'FAILED', todo: { heldOpen: 0, conflictsOpen: 2, apply: 'FAILED' } }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect((await screen.findByText('반영 실패')).className).toContain('fail');
    expect(screen.getByText('중복 2')).toBeTruthy();
  });

  it('반영까지 끝난 줄만 「반영 완료」다', async () => {
    줄들.push(줄({ id: 5881, rootId: 5873, kind: 'MERGE', status: 'DONE' }));
    render(<Authoring service="PAY" 할수={() => true} />);
    expect(await screen.findByText('반영 완료')).toBeTruthy();
  });

  it('「조치 필요」를 누르면 서버에 그것만 묻고 주소에 남긴다 · 첫 쪽으로 간다', async () => {
    window.history.replaceState(null, '', '#/authoring?page=2');
    render(<Authoring service="PAY" 할수={() => true} />);
    fireEvent.click(await screen.findByRole('button', { name: '조치 필요' }));
    expect(await screen.findByText('조치가 필요한 요청이 없습니다')).toBeTruthy();
    expect(거른것.at(-1)).toBe(true);
    expect(부른쪽.at(-1)).toBe(1);
    expect(window.location.hash).toBe('#/authoring?todo=1');
  });
});
