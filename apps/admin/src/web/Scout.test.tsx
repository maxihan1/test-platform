// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { Scout } from './Scout.js';
import type { 질문 } from './scoutView.js';

class 가짜귀 {
  static CLOSED = 2;
  static 들: 가짜귀[] = [];
  readyState = 1;
  onerror: (() => void) | null = null;
  private 귀들 = new Map<string, ((e: MessageEvent) => void)[]>();
  constructor(readonly url: string) {
    가짜귀.들.push(this);
  }
  addEventListener(종류: string, f: (e: MessageEvent) => void) {
    this.귀들.set(종류, [...(this.귀들.get(종류) ?? []), f]);
  }
  close() {
    this.readyState = 2;
  }
  보내기(종류: string, data: unknown, id?: number) {
    act(() => {
      for (const f of this.귀들.get(종류) ?? []) f(new MessageEvent(종류, { data: JSON.stringify(data), lastEventId: id === undefined ? '' : String(id) }));
    });
  }
}

type 부름 = { method: string; url: string; body: unknown };
let 부른것: 부름[] = [];
let 대화: { questions: 질문[]; btsUrl: string | null };

beforeEach(() => {
  가짜귀.들 = [];
  부른것 = [];
  대화 = { questions: [], btsUrl: 'https://bunker.test' };
  vi.stubGlobal('EventSource', 가짜귀);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      부른것.push({ method, url, body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
      if (method === 'GET') return new Response(JSON.stringify(대화), { status: 200 });
      if (url === '/api/chat/questions') return new Response(JSON.stringify({ id: 41, ahead: 2 }), { status: 201 });
      return new Response(null, { status: 204 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const 띄우기 = () => render(<Scout projectId={7} projectName="데모마켓 시험" 휴대폰={false} />);
const 열기 = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Scout 열기' }));
  await screen.findByRole('dialog', { name: 'Scout' });
};
const 질문줄 = (덧: Partial<질문>): 질문 => ({ id: 40, text: '어제 실패는?', status: 'DONE', createdAt: '2026-11-11T00:00:00Z', answer: '', steps: [], lastSeq: 0, ...덧 });

describe('Scout 채팅창 (도메인/챗봇 §8.18)', () => {
  it('처음 열면 그 프로젝트의 대화를 읽고 안내와 예시 넷을 보인다 — 빈 칸이면 보내기가 꺼진다', async () => {
    띄우기();
    expect(부른것).toEqual([]);
    await 열기();
    await screen.findByText('데모마켓 시험 프로젝트에 대해 물어보세요');
    expect(부른것[0]).toMatchObject({ method: 'GET', url: '/api/chat?projectId=7' });
    for (const 예 of ['오늘 실행 결과 요약', '최근 등록된 이슈', '회귀 실패만 보기', '어제 성능 테스트 결과']) screen.getByRole('button', { name: 예 });
    expect(screen.getByRole('button', { name: '보내기' })).toHaveProperty('disabled', true);
    screen.getByText('데모마켓 시험 프로젝트의 데이터로만 답해요');
    expect(screen.getByRole('button', { name: 'Scout 닫기' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('예시를 누르면 바로 묻고, 대기 → 진행 줄 → 답이 흘러 오면 진행 줄이 「확인한 것 N건」 으로 접힌다', async () => {
    띄우기();
    await 열기();
    fireEvent.click(await screen.findByRole('button', { name: '오늘 실행 결과 요약' }));
    await screen.findByText('앞에 2건 대기 중');
    expect(부른것.at(-1)).toEqual({ method: 'POST', url: '/api/chat/questions', body: { projectId: 7, text: '오늘 실행 결과 요약' } });
    const 귀 = 가짜귀.들[0]!;
    expect(귀.url).toBe('/api/chat/questions/41/stream?after=0');
    screen.getByRole('button', { name: '중단' });

    귀.보내기('wait', { ahead: 1, agentDown: false });
    screen.getByText('앞에 1건 대기 중');
    귀.보내기('chunk', { kind: 'STEP', body: { tool: 'run_result', ref: '12' } }, 1);
    screen.getByText('실행 #12 결과 확인하는 중');
    귀.보내기('chunk', { kind: 'STEP_DONE', body: { tool: 'run_result' } }, 2);
    screen.getByText('실행 #12 결과 확인');
    귀.보내기('chunk', { kind: 'TEXT', body: '| 케이스 | 결과 |\n|---|---|\n| [MKW-FN-001](case/MKW-FN-001) | 실패 |\n' }, 3);
    귀.보내기('chunk', { kind: 'TEXT', body: '- [기존 실패] [DM-12](issue/DM-12) 열림' }, 4);

    expect(screen.queryByText('실행 #12 결과 확인')).toBeNull();
    const 접기 = screen.getByRole('button', { name: /확인한 것 1건/ });
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('link', { name: 'MKW-FN-001' }).getAttribute('href')).toBe('#/cases/fn?q=MKW-FN-001&case=MKW-FN-001&service=MKW');
    expect(screen.getByRole('link', { name: 'DM-12' }).getAttribute('href')).toBe('https://bunker.test/issues/DM-12');
    screen.getByText('기존 실패');
    fireEvent.click(접기);
    screen.getByText('실행 #12 결과 확인');

    귀.보내기('end', { status: 'DONE' });
    expect(귀.readyState).toBe(가짜귀.CLOSED);
    expect(screen.queryByRole('button', { name: '중단' })).toBeNull();
  });

  it('Enter 는 보내고 Shift+Enter 와 한글 조합 중 Enter 는 보내지 않는다', async () => {
    띄우기();
    await 열기();
    const 칸 = await screen.findByRole('textbox', { name: '질문' });
    fireEvent.change(칸, { target: { value: '최근 실패' } });
    fireEvent.keyDown(칸, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(칸, { key: 'Enter', isComposing: true });
    expect(부른것.filter((p) => p.method === 'POST')).toEqual([]);
    fireEvent.keyDown(칸, { key: 'Enter' });
    await waitFor(() => expect(부른것.at(-1)?.body).toEqual({ projectId: 7, text: '최근 실패' }));
  });

  it('다시 열면 도는 질문을 받은 번호 다음부터 이어 받는다', async () => {
    대화.questions = [질문줄({ id: 40, status: 'RUNNING', answer: '지금까지 ', steps: [{ tool: 'run_list', done: true }], lastSeq: 4 })];
    띄우기();
    await 열기();
    await screen.findByText('지금까지');
    expect(가짜귀.들[0]!.url).toBe('/api/chat/questions/40/stream?after=4');
    가짜귀.들[0]!.보내기('chunk', { kind: 'TEXT', body: '이어서' }, 5);
    screen.getByText('지금까지 이어서');
  });

  it('중단하면 나온 답을 남기고 「질문을 중단했습니다」 와 다시 질문을 보인다 — 다시 질문은 같은 글로 묻는다', async () => {
    대화.questions = [질문줄({ id: 40, status: 'RUNNING', answer: '이번 주 E2E 는', lastSeq: 2 })];
    띄우기();
    await 열기();
    fireEvent.click(await screen.findByRole('button', { name: '중단' }));
    await waitFor(() => expect(부른것.at(-1)).toMatchObject({ method: 'POST', url: '/api/chat/questions/40/stop' }));
    가짜귀.들[0]!.보내기('end', { status: 'STOPPED' });
    screen.getByText('이번 주 E2E 는');
    screen.getByText('질문을 중단했습니다');
    fireEvent.click(screen.getByRole('button', { name: '다시 질문' }));
    await waitFor(() => expect(부른것.at(-1)?.body).toEqual({ projectId: 7, text: '어제 실패는?' }));
  });

  it('시간 초과 · 실패도 그 까닭과 다시 질문을 보인다', async () => {
    대화.questions = [질문줄({ id: 38, status: 'FAILED' }), 질문줄({ id: 39, status: 'TIMEOUT' })];
    띄우기();
    await 열기();
    await screen.findByText('답을 만들지 못했습니다');
    screen.getByText('답이 2분을 넘어 중단했습니다');
    // 다시 질문은 마지막 질문에만 선다
    expect(screen.getAllByRole('button', { name: '다시 질문' })).toHaveLength(1);
  });

  it('대기 중에 작성 서버가 꺼졌으면 앞 수 대신 꺼짐을 알리고, 차례가 오면 걷는다', async () => {
    띄우기();
    await 열기();
    fireEvent.click(await screen.findByRole('button', { name: '오늘 실행 결과 요약' }));
    await screen.findByText('앞에 2건 대기 중');
    const 귀 = 가짜귀.들[0]!;
    귀.보내기('wait', { ahead: 0, agentDown: true });
    screen.getByText('작성 서버가 꺼져 있어요. 켜지면 바로 답해요');
    expect(screen.queryByText(/대기 중/)).toBeNull();
    귀.보내기('wait', { ahead: 0, agentDown: false });
    expect(screen.queryByText('작성 서버가 꺼져 있어요. 켜지면 바로 답해요')).toBeNull();
    // 다시 붙은 연결은 걷는 wait 를 못 받는다 — 답 조각이 오면 걷는다
    귀.보내기('wait', { ahead: 0, agentDown: true });
    귀.보내기('chunk', { kind: 'TEXT', body: '최근 실행은 3건이에요' }, 1);
    expect(screen.queryByText('작성 서버가 꺼져 있어요. 켜지면 바로 답해요')).toBeNull();
    screen.getByText('최근 실행은 3건이에요');
  });

  it('창이 닫힌 동안 답이 끝나면 버튼에 점이 붙고 「답이 도착했어요」 가 3초 보인다', async () => {
    띄우기();
    await 열기();
    fireEvent.click(await screen.findByRole('button', { name: '최근 등록된 이슈' }));
    await screen.findByText('앞에 2건 대기 중');
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Scout 닫기' }));
    expect(screen.getByRole('button', { name: 'Scout 열기 · 답 만드는 중' })).toBeTruthy();
    가짜귀.들[0]!.보내기('end', { status: 'DONE' });
    screen.getByRole('button', { name: 'Scout 열기 · 답 도착' });
    screen.getByText('답이 도착했어요');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('답이 도착했어요')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Scout 열기 · 답 도착' }));
    screen.getByRole('button', { name: 'Scout 닫기' });
  });

  it('질문을 못 넣으면 오류를 보이고 쓴 글을 입력 칸에 되돌린다', async () => {
    띄우기();
    await 열기();
    vi.mocked(fetch).mockImplementationOnce(async () => new Response(JSON.stringify({ error: 'FORBIDDEN' }), { status: 403 }));
    const 칸 = await screen.findByRole('textbox', { name: '질문' });
    fireEvent.change(칸, { target: { value: '긴 질문' } });
    fireEvent.click(screen.getByRole('button', { name: '보내기' }));
    await screen.findByRole('alert');
    expect((칸 as HTMLTextAreaElement).value).toBe('긴 질문');
  });

  it('창을 닫았다 다시 열면 대화를 다시 읽는다 — 다른 탭에서 넣은 질문도 보인다', async () => {
    띄우기();
    await 열기();
    await screen.findByText('데모마켓 시험 프로젝트에 대해 물어보세요');
    fireEvent.click(screen.getByRole('button', { name: 'Scout 닫기' }));
    대화.questions = [질문줄({ text: '다른 탭 질문', answer: '다른 탭 답' })];
    await 열기();
    await screen.findByText('다른 탭 답');
    expect(부른것.filter((p) => p.method === 'GET')).toHaveLength(2);
  });

  it('대화 초기화는 한 번 더 묻지 않고 지우고 처음 열기로 돌아간다', async () => {
    대화.questions = [질문줄({ answer: '실패는 없어요.' })];
    띄우기();
    await 열기();
    await screen.findByText('실패는 없어요.');
    fireEvent.click(screen.getByRole('button', { name: '대화 초기화' }));
    await screen.findByText('데모마켓 시험 프로젝트에 대해 물어보세요');
    expect(부른것.at(-1)).toMatchObject({ method: 'DELETE', url: '/api/chat?projectId=7' });
  });
});
