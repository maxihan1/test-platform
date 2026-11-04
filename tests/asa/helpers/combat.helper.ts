import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 값읽기, 부르기, 사냥터좌표, type 바닥아이템, type 봇, type 구역, type 스폰, type 캐릭터, type 플레이어 } from './game.helper.js';

const 게임 = (p: 플레이어, 본문?: unknown) => ({
  토큰: p.토큰,
  캐릭터번호: p.캐릭터번호,
  ...(본문 === undefined ? {} : { 본문 }),
});

export async function 스폰목록(request: APIRequestContext, p: 플레이어): Promise<스폰[]> {
  return 값읽기<스폰[]>(await 부르기(request, 'GET', '/world/spawns', 게임(p)));
}

export async function 스폰고르기(request: APIRequestContext, p: 플레이어, 몬스터: string): Promise<스폰[]> {
  const 모두 = await 스폰목록(request, p);
  return 모두.filter((s) => s.monster === 몬스터).sort(() => Math.random() - 0.5);
}

export async function 몬스터처치(
  request: APIRequestContext,
  p: 플레이어,
  스폰자리: 스폰,
  몬스터: string = 스폰자리.monster,
  좌표: { x: number; z: number } = { x: 스폰자리.x, z: 스폰자리.z },
): Promise<APIResponse> {
  return 부르기(request, 'POST', '/combat/monster-kill', 게임(p, { monsterId: 몬스터, spawnId: 스폰자리.id, x: 좌표.x, z: 좌표.z }));
}

export async function 사망알리기(
  request: APIRequestContext,
  p: 플레이어,
  좌표: { x: number; z: number } = 사냥터좌표.Beginner,
  죽인쪽: 'Monster' | 'Bot' | 'Guard' = 'Monster',
  죽인번호: number | null = null,
): Promise<APIResponse> {
  return 부르기(request, 'POST', '/combat/player-death', 게임(p, { killerType: 죽인쪽, killerId: 죽인번호, x: 좌표.x, z: 좌표.z }));
}

export async function 떨어뜨릴때까지죽기(
  request: APIRequestContext,
  p: 플레이어,
  좌표: { x: number; z: number } = 사냥터좌표.Beginner,
  최대횟수 = 15,
): Promise<{
  응답본문: { dropped: 바닥아이템 | null; expLost: number; character: 캐릭터 } | undefined;
  알린시각: number;
}> {
  for (let i = 0; i < 최대횟수; i += 1) {
    const 알린시각 = Date.now();
    const 응답 = await 사망알리기(request, p, 좌표);
    const 값 = await 값읽기<{
      dropped: 바닥아이템 | null;
      expLost: number;
      character: 캐릭터;
    }>(응답);
    if (값.dropped !== null && 값.dropped !== undefined) return { 응답본문: 값, 알린시각 };
  }
  return { 응답본문: undefined, 알린시각: Date.now() };
}

export async function PK공격(
  request: APIRequestContext,
  p: 플레이어,
  공격자: { kind: string; id: number },
  대상: { kind: string; id: number },
  좌표: { x: number; z: number },
): Promise<APIResponse> {
  return 부르기(
    request,
    'POST',
    '/combat/pk-attack',
    게임(p, {
      attackerKind: 공격자.kind,
      attackerId: 공격자.id,
      targetKind: 대상.kind,
      targetId: 대상.id,
      x: 좌표.x,
      z: 좌표.z,
    }),
  );
}

export async function 봇목록(request: APIRequestContext, p: 플레이어, 구역이름?: 구역): Promise<봇[]> {
  const 경로 = 구역이름 === undefined ? '/bots' : `/bots?zone=${구역이름}`;
  return 값읽기<봇[]>(await 부르기(request, 'GET', 경로, 게임(p)));
}

export async function 살아있는봇들(request: APIRequestContext, p: 플레이어, 조건: (b: 봇) => boolean = () => true): Promise<봇[]> {
  const 모두 = await 봇목록(request, p);
  return 모두.filter((b) => !b.isDead && b.zone !== 'Boss' && b.zone !== 'Town' && 조건(b)).sort(() => Math.random() - 0.5);
}

export function 봇좌표(b: 봇): { x: number; z: number } {
  return b.zone === 'Intermediate' ? 사냥터좌표.Intermediate : 사냥터좌표.Beginner;
}

export async function 봇처치(request: APIRequestContext, p: 플레이어, 봇번호: number, 좌표: { x: number; z: number }): Promise<APIResponse> {
  return 부르기(request, 'POST', '/combat/bot-kill', 게임(p, { botId: 봇번호, x: 좌표.x, z: 좌표.z }));
}

export async function 바닥아이템목록(request: APIRequestContext, p: 플레이어, 구역이름?: 구역): Promise<APIResponse> {
  const 경로 = 구역이름 === undefined ? '/world/ground-items' : `/world/ground-items?zone=${구역이름}`;
  return 부르기(request, 'GET', 경로, 게임(p));
}

export async function 줍기(
  request: APIRequestContext,
  p: 플레이어,
  바닥번호: number,
  좌표: { x: number; z: number },
  봇번호?: number,
): Promise<APIResponse> {
  return 부르기(
    request,
    'POST',
    `/world/ground-items/${바닥번호}/pickup`,
    게임(p, {
      x: 좌표.x,
      z: 좌표.z,
      ...(봇번호 === undefined ? {} : { botId: 봇번호 }),
    }),
  );
}

export async function 재화원장(request: APIRequestContext, p: 플레이어, 개수 = 50): Promise<APIResponse> {
  return 부르기(request, 'GET', `/currency/ledger?limit=${개수}`, 게임(p));
}
