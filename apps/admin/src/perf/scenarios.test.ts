// 시나리오 트랜잭션 검사 — WebSocket · gRPC 주소와 칸의 짝 · ws(s):// 허용 호스트를 본다 (도메인/성능 §7 「PERF-F1-10 이 연 통로」)

import { describe, expect, it } from 'vitest';

import { 트랜잭션, 허용밖 } from './scenarios.js';
import type { Transaction } from './types.js';

const grpc = { proto: 'syntax = "proto3";', method: 'game.Hunt/Kill' };
const 된다 = (t: Record<string, unknown>) => 트랜잭션.safeParse({ name: 't', method: 'GET', url: '/x', ...t }).success;

describe('트랜잭션 종류 검사', () => {
  it('gRPC 만 grpc 칸을 들고, 주소는 경로나 http(s)://, 메서드는 패키지가 있어야 한다', () => {
    expect(된다({ type: 'GRPC', url: 'http://game.test:50051', grpc })).toBe(true);
    expect(된다({ type: 'GRPC', url: '/', grpc })).toBe(true);
    expect(된다({ type: 'GRPC', url: 'http://game.test:50051' })).toBe(false);
    expect(된다({ type: 'HTTP', grpc })).toBe(false);
    expect(된다({ type: 'GRPC', url: 'game.test:50051', grpc })).toBe(false);
    expect(된다({ type: 'GRPC', url: '/', grpc: { ...grpc, method: 'Hunt/Kill' } })).toBe(false);
  });

  it('WebSocket 주소는 경로나 ws(s):// 이고 ws(s):// 는 WebSocket 만 쓴다', () => {
    expect(된다({ type: 'WS', url: '/ws', messages: ['hi'] })).toBe(true);
    expect(된다({ type: 'WS', url: 'wss://game.test/ws' })).toBe(true);
    expect(된다({ type: 'WS', url: 'https://game.test/ws' })).toBe(false);
    expect(된다({ url: 'ws://game.test/ws' })).toBe(false);
  });
});

describe('허용밖', () => {
  it('ws(s):// 절대 주소의 호스트도 허용 목록과 맞춘다', () => {
    const tx = (url: string): Transaction => ({ name: url, type: 'WS', method: 'GET', url });
    expect(허용밖([tx('wss://game.test/ws'), tx('ws://game.test:9000/ws')], new Set(['game.test', 'game.test:9000']))).toBeNull();
    expect(허용밖([tx('wss://evil.test/ws')], new Set(['game.test']))).toBe('wss://evil.test/ws');
  });
});
