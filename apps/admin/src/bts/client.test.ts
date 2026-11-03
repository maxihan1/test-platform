// BTS 를 「QA Hub AI」 이름 · 받은 토큰 중 무엇으로 부르는지 — 가짜 fetch 와 가짜 대신 PAT 로 본다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 대신PAT, 대신PAT오류 } from '../auth/delegatedPat.js';

import { BTS부르기, BTS올리기, 봇열쇠 } from './client.js';

vi.mock('../auth/delegatedPat.js', () => ({
  대신PAT오류: class extends Error {},
  대신PAT: vi.fn(),
}));

describe('BTS 를 부를 열쇠 고르기', () => {
  const 받은머리: string[] = [];

  beforeEach(() => {
    받은머리.length = 0;
    vi.mocked(대신PAT).mockReset();
    vi.mocked(대신PAT).mockImplementation(async (누구) => `pat_${'username' in 누구 ? 누구.username : 누구.userId}`);
    vi.stubGlobal('fetch', async (_url: string, init?: { headers?: Record<string, string> }) => {
      받은머리.push(init?.headers?.authorization ?? '');
      return new Response('{}', { status: 200 });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('봇 이름은 그 이름의 대신 PAT 로 바꿔 Bearer 에 싣는다', async () => {
    expect(await BTS부르기({ baseUrl: 'https://bts.example.com/', 봇: 'qahub-ai' }, 'GET', '/api/v1/statuses')).toEqual({ status: 200, json: {} });
    expect(await BTS올리기({ baseUrl: 'https://bts.example.com', 봇: 'qahub-ai' }, 'DM-1', 'a.png', Buffer.from('png'))).toBe(200);
    expect(vi.mocked(대신PAT).mock.calls.map(([누구]) => 누구)).toEqual([{ username: 'qahub-ai' }, { username: 'qahub-ai' }]);
    expect(받은머리).toEqual(['Bearer pat_qahub-ai', 'Bearer pat_qahub-ai']);
  });

  it('받은 토큰(pat)은 그대로 싣고 Auth 에 묻지 않는다', async () => {
    await BTS부르기({ baseUrl: 'https://bts.example.com', pat: 'pat_person' }, 'GET', '/api/v1/webhooks');
    expect(받은머리).toEqual(['Bearer pat_person']);
    expect(대신PAT).not.toHaveBeenCalled();
  });

  it('빈 봇 이름 · 대신 PAT 를 못 받음은 BTS 를 안 부르고 던진다 — 보낼 줄이 닿지 않은 것과 같이 다시 보낸다', async () => {
    await expect(봇열쇠('')).rejects.toThrow('「QA Hub AI」 계정 이름이 없습니다 — 설정 › Issue Bunker 연결에 적어 주세요');
    await expect(BTS부르기({ baseUrl: 'https://bts.example.com', 봇: '' }, 'GET', '/x')).rejects.toThrow('계정 이름이 없습니다');
    vi.mocked(대신PAT).mockRejectedValueOnce(new 대신PAT오류('username qahub-ai 의 대신 PAT 를 못 받았다: HTTP 404'));
    await expect(BTS부르기({ baseUrl: 'https://bts.example.com', 봇: 'qahub-ai' }, 'GET', '/x')).rejects.toThrow('HTTP 404');
    expect(받은머리).toEqual([]);
  });
});
