import type { APIRequestContext, APIResponse } from '@playwright/test';

type 글묶음 = Record<string, unknown>;

async function 받기(res: APIResponse, 무엇: string): Promise<글묶음> {
  if (!res.ok()) throw new Error(`${무엇} 실패: ${String(res.status())} ${await res.text()}`);
  return (await res.json()) as 글묶음;
}

function 목록(값: unknown): 글묶음[] {
  return Array.isArray(값) ? (값 as 글묶음[]) : [];
}

export interface 로그줄 {
  seq: number;
  kind: string;
  players: number;
  skill?: string;
  value?: number;
  hpBefore?: number;
  gold?: number;
  exp?: number;
  party?: number;
  item?: string;
  count?: number;
  npc?: string;
  user?: string;
  from?: 글묶음;
  to?: 글묶음;
  by?: 글묶음;
}

function 사람(값: unknown): 글묶음 | undefined {
  return typeof 값 === 'object' && 값 !== null ? (값 as 글묶음) : undefined;
}

function 줄로(l: 글묶음): 로그줄 {
  const 숫자 = (k: string): number | undefined => (typeof l[k] === 'number' ? (l[k] as number) : undefined);
  const 글 = (k: string): string | undefined => (typeof l[k] === 'string' ? (l[k] as string) : undefined);
  return {
    seq: Number(l['seq'] ?? 0),
    kind: String(l['kind'] ?? ''),
    players: Number(l['players'] ?? 0),
    skill: 글('skill'),
    value: 숫자('value'),
    hpBefore: 숫자('hpBefore'),
    gold: 숫자('gold'),
    exp: 숫자('exp'),
    party: 숫자('party'),
    item: 글('item'),
    count: 숫자('count'),
    npc: 글('npc'),
    from: 사람(l['from']),
    to: 사람(l['to']),
    by: 사람(l['by']),
  };
}

export async function 로그읽기(admin: APIRequestContext, since: number | null, 아이디: string): Promise<{ last: number; lines: 로그줄[] }> {
  const 몸 = await 받기(await admin.get(`/test/log?since=${since === null ? '999999' : String(since)}`), '미션 로그 읽기');
  const last = Number(몸['last'] ?? 0);
  const 줄들 = 목록(몸['lines']).map(줄로);
  if (since !== null && 줄들.length > 0 && 줄들[0] !== undefined && 줄들[0].seq !== since + 1) {
    throw new Error(`게임 로그 줄이 빠졌습니다 (since ${String(since)} · 첫 줄 ${String(줄들[0].seq)})`);
  }
  const 내것 = (p: 글묶음 | undefined): boolean => p !== undefined && p['user'] === 아이디;
  return { last, lines: 줄들.filter((l) => 내것(l.from) || 내것(l.to) || 내것(l.by)) };
}

export function 준피해(줄들: 로그줄[], 아이디: string, 스킬?: string): 로그줄[] {
  return 줄들.filter((l) => l.kind === 'hit' && l.from?.['user'] === 아이디 && (스킬 === undefined || l.skill === 스킬));
}

export function 받은피해(줄들: 로그줄[], 아이디: string, 적?: string): 로그줄[] {
  return 줄들.filter((l) => l.kind === 'hit' && l.to?.['user'] === 아이디 && (적 === undefined || l.from?.['npc'] === 적));
}

export function 회복줄(줄들: 로그줄[], 아이디: string): 로그줄[] {
  return 줄들.filter((l) => l.kind === 'heal' && l.from?.['user'] === 아이디);
}

export function 처치줄(줄들: 로그줄[], 아이디: string, 적?: string): 로그줄[] {
  return 줄들.filter((l) => l.kind === 'kill' && l.by?.['user'] === 아이디 && (적 === undefined || l.npc === 적 || (l.to?.['npc'] ?? '') === 적));
}

export function 아이템줄(줄들: 로그줄[], 아이디: string): 로그줄[] {
  return 줄들.filter((l) => l.kind === 'item' && l.by?.['user'] === 아이디);
}

export function 설명안되는줄(줄들: 로그줄[], 알려진: (l: 로그줄) => boolean): 로그줄[] {
  return 줄들.filter((l) => !알려진(l));
}
