// PC 게임 작성의 지원 패드와 게임 플랫폼 — 작성 시작이 받아 애플리케이션에 남기고 집기가 싣는다 (도메인/게임 §3.10 「윈도우 PC」 · 도메인/작성 §7)

import { db } from '../settings/store.js';

const 패드값 = ['ps5', 'ps4', 'switch', 'xbox'] as const;

export interface 게임칸 {
  gamePlatform: 'android' | 'windows';
  gamePads: string[];
  /** 코드 저장소 — 있을 때만. 작성 AI 가 가이드에 빠진 게임 사실을 코드에서 찾는다 (도메인/작성 §3.6 「가이드와 게임 코드 맞춰 보기」) */
  codeRepos?: { name: string; url: string }[];
}

/** 게임 애플리케이션이면 플랫폼 · 지원 패드 · 코드 저장소, 아니면 null */
export async function 게임칸읽기(서비스: number): Promise<게임칸 | null> {
  const r = await (await db()).query<{ game_platform: 'android' | 'windows' | null; game_pads: string[]; code_repos: { name: string; url: string }[] }>(
    'SELECT game_platform, game_pads, code_repos FROM service WHERE id = $1',
    [서비스],
  );
  const 줄 = r.rows[0];
  if (줄?.game_platform == null) return null;
  return { gamePlatform: 줄.game_platform, gamePads: 줄.game_pads, ...(줄.code_repos.length === 0 ? {} : { codeRepos: 줄.code_repos }) };
}

/**
 * AUTHOR 본문의 gamePads 를 본다. 안 왔으면 undefined(그대로 둔다), 오면 거른 목록이다.
 * PC 게임이 아니면 값이 [] 여도 NOT_PC_GAME — 모바일 게임에 패드 체크는 없다
 */
export async function 패드판정(본문: unknown, 서비스: number): Promise<{ 패드?: string[]; error?: 'NOT_PC_GAME' | 'BAD_PAD' }> {
  if (본문 === undefined) return {};
  if ((await 게임칸읽기(서비스))?.gamePlatform !== 'windows') return { error: 'NOT_PC_GAME' };
  const 목록 = Array.isArray(본문) ? (본문 as unknown[]) : null;
  const 좋다 = 목록 !== null && 목록.every((p) => 패드값.some((값) => 값 === p)) && new Set(목록).size === 목록.length;
  return 좋다 ? { 패드: 목록 as string[] } : { error: 'BAD_PAD' };
}
