// /mcp PAT 확인이 Auth whoami 의 scopes 로 대신 PAT 를 거절하는지 가짜 Auth(fetch)로 본다 (도메인/인증 §7 「대신 PAT」)

import { describe, expect, it } from 'vitest';

import { PAT꼴, 토큰주인묻기 } from './pat.js';

const whoami = (status: number, 몸: unknown) => (async () => new Response(JSON.stringify(몸), { status })) as unknown as typeof fetch;
const 묻기 = (status: number, 몸: unknown) => 토큰주인묻기('https://auth.example.com/issuer', 'pat_abc', whoami(status, 몸));

describe('토큰주인묻기', () => {
  it('사람이 만든 PAT(scopes *) · commander 가 든 PAT 는 그 주인이다', async () => {
    expect(await 묻기(200, { userId: 'u1', username: 'minji', authMethod: 'pat', scopes: ['*'] })).toEqual({ 주인: 'u1' });
    expect(await 묻기(200, { userId: 'u1', authMethod: 'pat', scopes: ['commander', 'bunker'] })).toEqual({ 주인: 'u1' });
  });

  it('Commander 가 받은 대신 PAT(scopes bunker · vision)는 틀린 것으로 친다 — /mcp 로 돌아오지 못한다', async () => {
    expect(await 묻기(200, { userId: 'u1', authMethod: 'pat', scopes: ['bunker', 'vision'] })).toBe('틀림');
    expect(await 묻기(200, { userId: 'u1', authMethod: 'pat', scopes: [] })).toBe('틀림');
    expect(await 묻기(200, { userId: 'u1', authMethod: 'pat', scopes: 'commander' })).toBe('틀림');
  });

  it('scopes 칸이 없는 답(S25 전 Auth)은 사람 PAT 로 친다', async () => {
    expect(await 묻기(200, { userId: 'u1', authMethod: 'pat' })).toEqual({ 주인: 'u1' });
  });

  it('401 · 403 은 틀림, PAT 가 아닌 답 · 깨진 답은 닿지못함이다', async () => {
    expect(await 묻기(401, {})).toBe('틀림');
    expect(await 묻기(403, {})).toBe('틀림');
    expect(await 묻기(200, { userId: 'u1', authMethod: 'session', scopes: ['*'] })).toBe('닿지못함');
    expect(await 묻기(500, {})).toBe('닿지못함');
  });

  it('PAT 꼴은 pat_ 머리 · 200자 이하 · 공백 없음이다', () => {
    expect(PAT꼴('pat_abc')).toBe(true);
    expect(PAT꼴('mcj_abc')).toBe(false);
    expect(PAT꼴('pat_a b')).toBe(false);
    expect(PAT꼴(`pat_${'x'.repeat(200)}`)).toBe(false);
  });
});
