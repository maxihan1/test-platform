// @vitest-environment jsdom
// 성능 마법사 — 게임 서버 부하(더미 클라이언트 · WebSocket · gRPC 트랜잭션) 검사 (도메인/성능 §3.9 「게임 서버 부하」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { ServiceRow, User } from './api.js';
import { perfApi, type PerfAgent, type PerfScenario, type 더미클라이언트 } from './perfApi.js';
import { PerfWizard } from './PerfWizard.js';

const 앱: ServiceRow = {
  id: 7,
  prefix: 'ZPG',
  name: 'ZPG 게임',
  color: '#000',
  projectId: 3,
  projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs: 'write', authoring: 'read' },
};
const 사람: User = { username: 'zpg', displayName: '성능', role: 'member', dashboard: 'none', mustChangePassword: false, services: [앱] };
const 에이전트: PerfAgent = { id: 11, name: '기본 에이전트', mode: 'LOAD', projectId: null, host: 'qahub', status: 'CONNECTED', maxVus: 1000, lastSeenAt: null, version: '1' };
const 봇: 더미클라이언트 = { id: 5, name: '게임 봇', command: './bot', bytes: 3_145_728, createdAt: '2026-10-22T00:00:00.000Z' };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
  localStorage.clear();
});

async function 그리기(더미: 더미클라이언트[] = [], id: number | null = null) {
  vi.spyOn(perfApi, 'agents').mockResolvedValue({ agents: [에이전트] });
  vi.spyOn(perfApi, 'dummyClients').mockResolvedValue({ clients: 더미 });
  render(<PerfWizard id={id} 띠서비스={앱} user={사람} />);
  await screen.findByRole('button', { name: '다음' });
}

const 다음 = () => fireEvent.click(screen.getByRole('button', { name: '다음' }));

describe('더미 클라이언트', () => {
  it('올린 것이 없으면 방식 고르개가 없다', async () => {
    await 그리기();
    expect(screen.queryByLabelText('시나리오 방식')).toBeNull();
  });

  it('더미를 고르면 트랜잭션 표 대신 클라이언트 고르개가 서고 저장 본문에는 dummyClient 만 든다', async () => {
    const 만들기 = vi.spyOn(perfApi, 'create').mockResolvedValue({ id: 42, version: 1 });
    await 그리기([봇]);
    fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '접속 부하' } });
    fireEvent.click(screen.getByRole('button', { name: '트랜잭션 추가' }));
    fireEvent.change(screen.getByLabelText('시나리오 방식'), { target: { value: 'DUMMY' } });

    expect(screen.queryByRole('button', { name: '트랜잭션 추가' })).toBeNull();
    expect((screen.getByLabelText('더미 클라이언트') as HTMLSelectElement).value).toBe('5');
    fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
    await waitFor(() => expect(만들기).toHaveBeenCalled());
    const body = 만들기.mock.calls[0]![2];
    expect(body.dummyClient).toBe(5);
    expect(body).not.toHaveProperty('transactions');
  });

  it('2단계는 TPS 로 못 바꾸고 4단계는 부하 중 페이지 측정 칸이 없다', async () => {
    await 그리기([봇]);
    fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '접속 부하' } });
    fireEvent.change(screen.getByLabelText('시나리오 방식'), { target: { value: 'DUMMY' } });
    다음();
    expect(screen.getByText('더미 클라이언트는 가상 사용자 수 기준으로만 걸 수 있습니다')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '목표 TPS로 설정' })).toBeNull();
    다음();
    다음();
    await screen.findByLabelText(/기본 에이전트/);
    expect(screen.queryByLabelText('부하 중 페이지 로딩 측정')).toBeNull();
  });

  it('본문에 dummyClient 가 든 시나리오는 더미로 열린다', async () => {
    const 시나리오: PerfScenario = {
      id: 42,
      serviceId: 7,
      name: '접속 부하',
      version: 1,
      accountsRows: 0,
      schedule: null,
      versions: [],
      body: { dummyClient: 5, load: { basis: 'VUS', testType: 'LOAD', stages: [{ durationSec: 60, target: 30 }] } },
    };
    vi.spyOn(perfApi, 'scenario').mockResolvedValue(시나리오);
    await 그리기([봇], 42);
    expect((screen.getByLabelText('시나리오 방식') as HTMLSelectElement).value).toBe('DUMMY');
    await waitFor(() => expect((screen.getByLabelText('더미 클라이언트') as HTMLSelectElement).value).toBe('5'));
  });
});

describe('트랜잭션 종류', () => {
  async function 줄열기() {
    await 그리기();
    fireEvent.change(screen.getByLabelText('시나리오 이름'), { target: { value: '채팅' } });
    fireEvent.click(screen.getByRole('button', { name: '트랜잭션 추가' }));
  }

  it('WebSocket 은 메서드 대신 보낼 메시지와 기다릴 글자를 받는다', async () => {
    const 만들기 = vi.spyOn(perfApi, 'create').mockResolvedValue({ id: 42, version: 1 });
    await 줄열기();
    fireEvent.change(screen.getByLabelText('종류'), { target: { value: 'WS' } });
    expect(screen.queryByLabelText('메서드')).toBeNull();
    fireEvent.change(screen.getByLabelText('주소'), { target: { value: 'wss://game.example.com/ws' } });
    fireEvent.change(screen.getByLabelText(/^보낼 메시지/), { target: { value: 'hello\nping' } });
    fireEvent.change(screen.getByLabelText(/^기다릴 글자/), { target: { value: 'welcome' } });
    expect(screen.getByText(/10초 안에 그 글자가 든 메시지가 와야 통과/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
    await waitFor(() => expect(만들기).toHaveBeenCalled());
    expect(만들기.mock.calls[0]![2].transactions).toEqual([
      expect.objectContaining({ type: 'WS', url: 'wss://game.example.com/ws', messages: ['hello', 'ping'], check: { contains: 'welcome' } }),
    ]);
    expect(screen.getByText('WebSocket', { selector: 'td' })).toBeTruthy();
  });

  it('gRPC 는 proto 파일을 글로 읽어 grpc 에 담고, 종류를 바꾸면 grpc 를 지운다', async () => {
    const 만들기 = vi.spyOn(perfApi, 'create').mockResolvedValue({ id: 42, version: 1 });
    const 저장 = vi.spyOn(perfApi, 'save').mockResolvedValue({ version: 2 });
    await 줄열기();
    fireEvent.change(screen.getByLabelText('종류'), { target: { value: 'GRPC' } });
    fireEvent.change(screen.getByLabelText('주소'), { target: { value: 'https://game.example.com' } });
    const 파일 = new File(['syntax = "proto3";'], 'cart.proto');
    fireEvent.change(screen.getByLabelText(/^proto 파일/), { target: { files: [파일] } });
    expect(await screen.findByText('proto 파일을 읽었습니다 (18자)')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^메서드/), { target: { value: 'shop.Cart/AddItem' } });
    fireEvent.change(screen.getByLabelText('메시지(JSON)'), { target: { value: '{"id":1}' } });
    fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
    await waitFor(() => expect(만들기).toHaveBeenCalledTimes(1));
    expect(만들기.mock.calls[0]![2].transactions![0]).toMatchObject({
      type: 'GRPC',
      body: '{"id":1}',
      grpc: { proto: 'syntax = "proto3";', method: 'shop.Cart/AddItem' },
    });

    fireEvent.change(screen.getByLabelText('종류'), { target: { value: 'HTTP' } });
    await screen.findByLabelText('메서드');
    fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
    await waitFor(() => expect(저장).toHaveBeenCalled());
    const 줄 = 저장.mock.calls[0]![1].transactions![0]!;
    expect(줄.type).toBeUndefined();
    expect(줄.grpc).toBeUndefined();
  });
});
