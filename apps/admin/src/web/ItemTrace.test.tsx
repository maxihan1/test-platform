// @vitest-environment jsdom
// 항목 상세 「네트워크 · 조작 · 콘솔」 (2026-10-16 시안 A · 도메인/실행 §3.2 「trace」)

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { trace없는까닭 } from '../execution/traceReason.js';
import type { ItemTrace } from './api.js';
import { ItemTraceSection } from './ItemTrace.js';

afterEach(cleanup);

const 요청 = (덮: Partial<ItemTrace['network'][number]>): ItemTrace['network'][number] => ({
  seq: 1,
  atMs: 100,
  method: 'GET',
  url: 'http://demo.market/login',
  status: 200,
  resourceType: 'document',
  durationMs: 131,
  failure: null,
  requestBody: null,
  responseBody: null,
  ...덮,
});

const 실패기록: ItemTrace = {
  status: 'DONE',
  reason: null,
  network: [
    요청({}),
    요청({ seq: 2, method: 'POST', url: 'http://demo.market/api/auth/login', status: 500, durationMs: 4812, resourceType: 'fetch',
      requestBody: '{"password":"********"}', responseBody: '{"error":"INTERNAL"}' }),
    요청({ seq: null, method: 'POST', url: 'http://demo.market/api/auth/logout', status: 204 }),
  ],
  actions: [
    { seq: 2, atMs: 900, title: 'Fill "********"', target: "getByLabel('비밀번호')", value: '********', durationMs: 28, error: null },
    { seq: 2, atMs: 5950, title: 'Expect "toBeVisible"', target: "getByRole('alert')", value: null, durationMs: 5002, error: 'Timeout 5000ms exceeded' },
  ],
  console: [
    { seq: 2, atMs: 5760, level: 'error', text: 'Failed to load resource: 500', url: 'http://demo.market/api/auth/login' },
    { seq: 2, atMs: 5800, level: 'warning', text: '[auth] retrying', url: null },
  ],
};

const 탭 = (이름: RegExp) => screen.getByRole('tab', { name: 이름 });
const 표줄 = () => within(screen.getByRole('tabpanel')).getAllByRole('row').slice(1);

describe('항목 상세 네트워크 · 조작 · 콘솔', () => {
  it('실패가 있으면 네트워크 탭 · 「실패만」으로 열고, 첫 실패 요청의 가린 본문을 펴 둔다', () => {
    render(<ItemTraceSection trace={실패기록} />);
    expect(탭(/네트워크/).getAttribute('aria-selected')).toBe('true');
    expect((screen.getByRole('checkbox', { name: /실패만/ }) as HTMLInputElement).checked).toBe(true);
    // 실패 줄 하나 + 펴 둔 본문 줄
    expect(표줄()).toHaveLength(2);
    expect(screen.getByText('http://demo.market/api/auth/login').closest('button')?.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/"password":"\*\*\*\*\*\*\*\*"/)).toBeTruthy();
    expect(screen.queryByText('http://demo.market/login')).toBeNull();
  });

  it('「실패만」을 끄면 준비 · 정리 줄까지 전부 보인다', () => {
    render(<ItemTraceSection trace={실패기록} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /실패만/ }));
    expect(screen.getByText('http://demo.market/login')).toBeTruthy();
    expect(screen.getByText('준비 · 정리')).toBeTruthy();
  });

  it('주소를 누르면 본문을 접고 다시 편다', () => {
    render(<ItemTraceSection trace={실패기록} />);
    const 주소 = screen.getByRole('button', { name: 'http://demo.market/api/auth/login' });
    fireEvent.click(주소);
    expect(screen.queryByText(/"password"/)).toBeNull();
    fireEvent.click(주소);
    expect(screen.getByText(/"password"/)).toBeTruthy();
  });

  it('탭마다 실패 수를 달고, 조작 · 콘솔 탭은 실패 줄만 보인다', () => {
    render(<ItemTraceSection trace={실패기록} />);
    expect(탭(/조작/).textContent).toContain('실패 1');
    expect(탭(/콘솔/).textContent).toContain('오류 1');
    fireEvent.click(탭(/조작/));
    expect(screen.getByText('Timeout 5000ms exceeded')).toBeTruthy();
    expect(표줄()).toHaveLength(1);
    fireEvent.click(탭(/콘솔/));
    expect(screen.getByText('Failed to load resource: 500')).toBeTruthy();
    expect(screen.queryByText('[auth] retrying')).toBeNull();
  });

  it('실패가 없는 항목은 「실패만」을 끈 채 전부 보인다', () => {
    render(<ItemTraceSection trace={{ ...실패기록, network: [요청({})], actions: [], console: [] }} />);
    expect((screen.getByRole('checkbox', { name: /실패만/ }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText('http://demo.market/login')).toBeTruthy();
    fireEvent.click(탭(/콘솔/));
    expect(screen.getByText('보일 줄이 없습니다')).toBeTruthy();
  });

  it('내려받기 고리가 없다 — 원본 trace 는 에이전트만 본다', () => {
    const { container } = render(<ItemTraceSection trace={실패기록} />);
    expect(container.querySelector('a')).toBeNull();
  });

  it.each([
    [trace없는까닭.끊김, '러너가 실행을 끊어(제한 시간 · 멈춤) 기록이 남지 않았습니다'],
    [trace없는까닭.파일없음, '다른 컴퓨터의 러너에서 돌았거나 기록 파일을 옮기다 실패해 기록이 없습니다'],
    [trace없는까닭.앱, 'Android 앱 실행은 기록을 남기지 않습니다'],
    ['처음 보는 사유', '처음 보는 사유'],
  ])('trace 없음 — 사유 「%s」', (reason, 글) => {
    render(<ItemTraceSection trace={{ status: 'NONE', reason, network: [], actions: [], console: [] }} />);
    expect(screen.getByText('trace 없음')).toBeTruthy();
    expect(screen.getByText(글)).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('읽기 실패와 아직 안 푼 항목을 가른다', () => {
    render(<ItemTraceSection trace={{ status: 'FAILED', reason: 'trace 를 읽지 못했다: bad zip', network: [], actions: [], console: [] }} />);
    expect(screen.getByText('읽기 실패')).toBeTruthy();
    cleanup();
    render(<ItemTraceSection trace={null} />);
    expect(screen.getByText('아직 없음')).toBeTruthy();
  });
});
