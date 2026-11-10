// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { Scout } from './Scout.js';
import { 붙일자리, 자리읽기 } from './scoutHud.js';
import type { 질문 } from './scoutView.js';
import { 이어붙이기 } from './useVoice.js';

class 가짜귀 {
  static CLOSED = 2;
  readyState = 1;
  onerror: (() => void) | null = null;
  addEventListener() {}
  close() {
    this.readyState = 2;
  }
}

class 가짜인식기 {
  static 들: 가짜인식기[] = [];
  lang = '';
  interimResults = false;
  continuous = true;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  시작함 = false;
  constructor() {
    가짜인식기.들.push(this);
  }
  start() {
    this.시작함 = true;
  }
  stop() {
    act(() => this.onend?.());
  }
  abort() {}
}

let 대화: { questions: 질문[]; btsUrl: string | null };
let 보낸것: string[];

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '#/runs');
  대화 = { questions: [], btsUrl: null };
  보낸것 = [];
  가짜인식기.들 = [];
  vi.stubGlobal('EventSource', 가짜귀);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') return new Response(JSON.stringify(대화), { status: 200 });
      보낸것.push(url);
      if (url === '/api/chat/questions') return new Response(JSON.stringify({ id: 41, ahead: 0 }), { status: 201 });
      return new Response(null, { status: 204 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const 띄우기 = (휴대폰 = false) => render(<Scout projectId={7} projectName="데모마켓 시험" 휴대폰={휴대폰} />);
const 버튼 = () => screen.getByRole('button', { name: /^Scout (열기|닫기)/ });
const 열기 = async () => {
  fireEvent.click(screen.getByRole('button', { name: /^Scout 열기/ }));
  await screen.findByRole('dialog', { name: 'Scout' });
};
const 질문줄 = (덧: Partial<질문>): 질문 => ({ id: 40, text: '어제 실패는?', status: 'DONE', createdAt: '2026-11-11T00:00:00Z', answer: '', steps: [], lastSeq: 0, ...덧 });

describe('Scout 레이더 버튼 상태 (도메인/챗봇 §8.18 「HUD 버튼」)', () => {
  it('마우스를 올리면 보일 이름은 Scout 이고, 창이 닫힌 채 답을 만드는 동안만 고리가 맥박친다', async () => {
    대화.questions = [질문줄({ status: 'RUNNING' })];
    const { container } = 띄우기();
    expect(container.querySelector('.scout-name')?.textContent).toBe('Scout');
    expect(container.querySelector('.scout-ring')).toBeNull();
    await 열기();
    await screen.findByRole('button', { name: '중단' });
    expect(container.querySelector('.scout-ring'), '열려 있으면 창의 진행 줄이 알린다').toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Scout 닫기' }));
    screen.getByRole('button', { name: 'Scout 열기 · 답 만드는 중' });
    expect(container.querySelector('.scout-ring')).not.toBeNull();
  });
});

describe('버튼 끌기 · 자리 기억', () => {
  it('5px 이하로 움직이면 끌기가 아니라 열기다', async () => {
    const { container } = 띄우기();
    fireEvent.pointerDown(버튼(), { clientX: 0, clientY: 0, button: 0, pointerId: 1 });
    fireEvent.pointerMove(버튼(), { clientX: 3, clientY: 3, pointerId: 1 });
    fireEvent.pointerUp(버튼(), { clientX: 3, clientY: 3, pointerId: 1 });
    await 열기();
    expect(container.querySelector('.scout.moved')).toBeNull();
    expect(localStorage.getItem('scout-hud:pc')).toBeNull();
  });

  it('끌어 놓으면 가까운 가장자리에 붙고 높이는 그대로다 — 자리를 기억하고, 놓은 뒤 click 으로 창이 열리지 않는다', () => {
    const { container } = 띄우기();
    fireEvent.pointerDown(버튼(), { clientX: 0, clientY: 0, button: 0, pointerId: 1 });
    fireEvent.pointerMove(버튼(), { clientX: 100, clientY: 300, pointerId: 1 });
    expect(버튼().className).toContain('dragging');
    expect(버튼().style.left).toBe('100px');
    fireEvent.pointerUp(버튼(), { clientX: 100, clientY: 300, pointerId: 1 });
    fireEvent.click(버튼());
    expect(screen.queryByRole('dialog')).toBeNull();
    const y = window.innerHeight - 300 - 56;
    expect(JSON.parse(localStorage.getItem('scout-hud:pc')!)).toEqual({ 쪽: 'left', y });
    const 틀 = container.querySelector<HTMLElement>('.scout')!;
    expect(틀.className).toBe('scout moved left');
    expect(틀.style.getPropertyValue('--hud-y')).toBe(`${y}px`);
    expect(버튼().style.left).toBe('');
  });

  it('PC 와 휴대폰은 자리를 따로 둔다 — 못 읽으면 처음 자리(오른쪽 아래)다', () => {
    localStorage.setItem('scout-hud:phone', JSON.stringify({ 쪽: 'left', y: 200 }));
    localStorage.setItem('scout-hud:pc', '{깨진');
    const { container } = 띄우기(true);
    expect(container.querySelector('.scout')!.className).toBe('scout moved left');
    cleanup();
    const pc = 띄우기(false);
    expect(pc.container.querySelector('.scout')!.className).toBe('scout');
  });

  it('창이 열려 있는 동안은 옮기지 않는다', async () => {
    띄우기();
    await 열기();
    fireEvent.pointerDown(버튼(), { clientX: 0, clientY: 0, button: 0, pointerId: 1 });
    fireEvent.pointerMove(버튼(), { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(버튼(), { clientX: 200, clientY: 200, pointerId: 1 });
    expect(버튼().className).not.toContain('dragging');
    expect(localStorage.getItem('scout-hud:pc')).toBeNull();
  });

  it('붙일자리 — 가운데보다 왼쪽이면 왼쪽, 높이는 아래에서 잰다', () => {
    expect(붙일자리(100, 300, 1000, 800)).toEqual({ 쪽: 'left', y: 444 });
    expect(붙일자리(600, 790, 1000, 800)).toEqual({ 쪽: 'right', y: 0 });
    expect(자리읽기(false)).toBeNull();
  });
});

describe('열고 닫기', () => {
  it('닫으면 줄어드는 동안 창을 남겨 두고(가려진 채) 0.3초 뒤에 내린다 — 그새 다시 열면 그대로 열린다', async () => {
    const { container } = 띄우기();
    await 열기();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container.querySelector('.scout-win.closing')).not.toBeNull();
    expect(document.activeElement).toBe(버튼());
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(container.querySelector('.scout-win')).toBeNull();

    fireEvent.click(버튼());
    fireEvent.click(버튼());
    fireEvent.click(버튼());
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(container.querySelector('.scout-win:not(.closing)')).not.toBeNull();
  });

  it('휴대폰은 열 때 뒤로 가기 기록을 하나 쌓고, 뒤로 가기 · ⌄ 로 닫으면 그 칸이 걷힌다', async () => {
    const 앞길이 = window.history.length;
    띄우기(true);
    await 열기();
    expect(window.history.state?.scout).toEqual(expect.any(Number));
    expect(window.history.length).toBe(앞길이 + 1);
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await 열기();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.history.state?.scout).toBeUndefined();
  });

  it('휴대폰 창 안 링크는 연 칸을 걷고 창을 내린 뒤 그 화면으로 옮긴다 — 뒤로 가기가 헛돌지 않게', async () => {
    대화.questions = [질문줄({ answer: '[실행 #12](run/UI/12) 결과예요' })];
    const 앞길이 = window.history.length;
    띄우기(true);
    await 열기();
    fireEvent.click(await screen.findByRole('link', { name: '실행 #12' }));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/12'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.history.state?.scout, '새 화면 칸 아래에 Scout 칸이 남지 않는다').toBeUndefined();
    expect(window.history.length).toBeLessThanOrEqual(앞길이 + 1);
  });

  it('새로고침 · 앞으로 가기로 남은 옛 Scout 칸을 지금 연 칸으로 보지 않는다 — ⌄ 한 번에 닫힌다', async () => {
    window.history.pushState({ scout: 999 }, '');
    띄우기(true);
    await 열기();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.history.state?.scout).toBe(999);
  });

  it('휴대폰 머리 줄을 80px 넘게 끌어내리면 닫히고, 덜 끌면 제자리다 — 단추를 누른 것은 쓸기가 아니다', async () => {
    const { container } = 띄우기(true);
    await 열기();
    const 머리 = container.querySelector('.scout-head')!;
    fireEvent.pointerDown(머리, { clientY: 100, button: 0, pointerId: 2 });
    fireEvent.pointerMove(머리, { clientY: 150, pointerId: 2 });
    expect(container.querySelector<HTMLElement>('.scout-win')!.style.getPropertyValue('--drag')).toBe('50px');
    fireEvent.pointerUp(머리, { clientY: 150, pointerId: 2 });
    screen.getByRole('dialog', { name: 'Scout' });
    expect(container.querySelector<HTMLElement>('.scout-win')!.style.getPropertyValue('--drag')).toBe('');

    fireEvent.pointerDown(screen.getByRole('button', { name: '대화 초기화' }), { clientY: 100, button: 0, pointerId: 3 });
    fireEvent.pointerMove(머리, { clientY: 300, pointerId: 3 });
    expect(container.querySelector('.scout-win.swiping')).toBeNull();

    fireEvent.pointerDown(머리, { clientY: 100, button: 0, pointerId: 4 });
    fireEvent.pointerMove(머리, { clientY: 220, pointerId: 4 });
    fireEvent.pointerUp(머리, { clientY: 220, pointerId: 4 });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('🎤 음성 입력 (§8.18 「입력」 · 공통 상태 ②)', () => {
  it('못 쓰는 브라우저에서는 🎤 를 숨긴다', async () => {
    띄우기();
    await 열기();
    expect(screen.queryByRole('button', { name: '음성으로 입력' })).toBeNull();
  });

  it('들은 말은 쓰던 글 뒤에 채우기만 하고 보내지 않는다 — 듣는 동안 안내와 「음성 입력 종료」 가 선다', async () => {
    vi.stubGlobal('webkitSpeechRecognition', 가짜인식기);
    띄우기();
    await 열기();
    const 칸 = screen.getByRole<HTMLTextAreaElement>('textbox', { name: '질문' });
    fireEvent.change(칸, { target: { value: '어제' } });
    fireEvent.click(screen.getByRole('button', { name: '음성으로 입력' }));
    const 귀 = 가짜인식기.들[0]!;
    expect(귀).toMatchObject({ 시작함: true, lang: 'ko-KR', interimResults: true, continuous: false });
    screen.getByText('듣는 중 · 말을 마치면 확인 후 보내세요');
    act(() => 귀.onresult?.({ results: [[{ transcript: '실패 ' }], [{ transcript: '보여 줘' }]] }));
    expect(칸.value).toBe('어제 실패 보여 줘');
    expect(칸.className).toBe('live');

    expect(칸.readOnly, '듣는 동안 친 글은 들은 말에 덮인다').toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '음성 입력 종료' }));
    expect(screen.queryByText('듣는 중 · 말을 마치면 확인 후 보내세요')).toBeNull();
    screen.getByRole('button', { name: '음성으로 입력' });
    expect(칸.value).toBe('어제 실패 보여 줘');
    expect(보낸것).toEqual([]);
  });

  it('보내면 듣기를 멈추고, 멈춘 뒤 늦게 온 결과가 비운 칸을 다시 채우지 않는다', async () => {
    vi.stubGlobal('webkitSpeechRecognition', 가짜인식기);
    띄우기();
    await 열기();
    fireEvent.click(screen.getByRole('button', { name: '음성으로 입력' }));
    const 귀 = 가짜인식기.들[0]!;
    const 늦은결과 = 귀.onresult!;
    act(() => 늦은결과({ results: [[{ transcript: '최근 이슈' }]] }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: '질문' }), { key: 'Enter' });
    await waitFor(() => expect(보낸것).toEqual(['/api/chat/questions']));
    act(() => 귀.onresult?.({ results: [[{ transcript: '최근 이슈' }]] }));
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: '질문' }).value).toBe('');
  });

  it('이어붙이기 — 빈 칸이면 들은 말만, 상한을 넘기지 않는다', () => {
    expect(이어붙이기('', ' 안녕 ', 10)).toBe('안녕');
    expect(이어붙이기('질문 ', '이어서', 10)).toBe('질문 이어서');
    expect(이어붙이기('12345678', '90abc', 10)).toBe('12345678 9');
  });
});
