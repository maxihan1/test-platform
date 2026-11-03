// BTS 를 「QA Hub AI」 이름 · 받은 토큰 중 무엇으로 부르는지 — 가짜 fetch 와 가짜 대신 PAT 로 본다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 대신PAT, 대신PAT오류 } from '../auth/delegatedPat.js';

import { BTS부르기, BTS올리기, BTS주소허용, 봇열쇠, 봇이름허용 } from './client.js';

vi.mock('../auth/delegatedPat.js', () => ({
  대신PAT오류: class extends Error {},
  대신PAT: vi.fn(),
}));

describe('BTS 를 부를 열쇠 고르기', () => {
  const 받은머리: string[] = [];

  beforeEach(() => {
    받은머리.length = 0;
    vi.stubEnv('BTS_BOT_USERNAMES', 'qahub-ai');
    vi.stubEnv('BTS_URLS', 'https://bts.example.com');
    vi.mocked(대신PAT).mockReset();
    vi.mocked(대신PAT).mockImplementation(async (누구) => `pat_${'username' in 누구 ? 누구.username : 누구.userId}`);
    vi.stubGlobal('fetch', async (_url: string, init?: { headers?: Record<string, string> }) => {
      받은머리.push(init?.headers?.authorization ?? '');
      return new Response('{}', { status: 200 });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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

  it('서버 BTS_URLS 밖의 주소에는 봇 · 사람 토큰 모두 보내지 않고 던진다 — 대신 PAT 도 받지 않는다', async () => {
    await expect(BTS부르기({ baseUrl: 'https://evil.example.com', 봇: 'qahub-ai' }, 'GET', '/x')).rejects.toThrow('BTS_URLS 에 없습니다');
    await expect(BTS부르기({ baseUrl: 'https://evil.example.com', pat: 'pat_person' }, 'GET', '/x')).rejects.toThrow('BTS_URLS 에 없습니다');
    expect(BTS주소허용('https://bts.example.com/sub/path', { BTS_URLS: 'https://bts.example.com/' })).toBe(true);
    expect(BTS주소허용('https://bts.example.com.evil.io', { BTS_URLS: 'https://bts.example.com' })).toBe(false);
    expect(BTS주소허용('http://bts.example.com', { BTS_URLS: 'https://bts.example.com' })).toBe(false);
    expect(BTS주소허용('https://bts.example.com', {})).toBe(false);
    expect(대신PAT).not.toHaveBeenCalled();
    expect(받은머리).toEqual([]);
  });

  it('서버 BTS_BOT_USERNAMES 밖의 이름은 Auth 에 묻지도 않고 던진다 — 설정 칸에 남의 이름을 적어 그 사람 대신 PAT 를 받아 가지 못하게', async () => {
    await expect(BTS부르기({ baseUrl: 'https://bts.example.com', 봇: 'maxi' }, 'GET', '/x')).rejects.toThrow('BTS_BOT_USERNAMES 에 없습니다');
    vi.stubEnv('BTS_BOT_USERNAMES', '');
    await expect(봇열쇠('qahub-ai')).rejects.toThrow('BTS_BOT_USERNAMES 에 없습니다');
    expect(봇이름허용('qahub-ai', { BTS_BOT_USERNAMES: ' qahub-ai , qa-bot2 ' })).toBe(true);
    expect(봇이름허용('qa-bot2', { BTS_BOT_USERNAMES: 'qahub-ai,qa-bot2' })).toBe(true);
    expect(봇이름허용('qahub', { BTS_BOT_USERNAMES: 'qahub-ai' })).toBe(false);
    expect(대신PAT).not.toHaveBeenCalled();
    expect(받은머리).toEqual([]);
  });
});
