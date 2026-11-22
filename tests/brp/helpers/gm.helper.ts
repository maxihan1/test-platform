import type { GameDriver } from '@platform/kit';

import { 알림띠 } from '../components/toast.component.js';
import { 채팅창 } from '../pages/chat.page.js';

export function 색글떼기(글: string): string {
  return 글.replace(/<[^>]+>/g, '').trim();
}

async function GM보내기(game: GameDriver, 명령: string, 기다릴글?: string): Promise<채팅창> {
  const 알림 = new 알림띠(game);
  const 기다릴 = `[GM] ${기다릴글 ?? 명령}`;
  await 알림.사라질때까지(기다릴, 6_000);
  const 열려있었나 = await 채팅창.열려있나(game);
  const 창 = await 채팅창.열기(game);
  await 창.탭고르기('전체');
  await 창.보내기(`/gm ${명령}`);
  if (!(await 알림.뜰때까지(기다릴, 15_000))) throw new Error(`GM 명령 「/gm ${명령}」의 알림 「${기다릴}」이 15초 안에 안 떴습니다`);
  if (!열려있었나) await 창.닫기();
  return 창;
}

export async function GM골드(game: GameDriver, 골드: number): Promise<void> {
  await GM보내기(game, `gold ${String(골드)}`);
}

export async function GM레벨(game: GameDriver, 레벨: number): Promise<void> {
  await GM보내기(game, `level ${String(레벨)}`);
}

export async function GM경험치(game: GameDriver, 경험치: number): Promise<void> {
  await GM보내기(game, `exp ${String(경험치)}`, `exp +${String(경험치)}`);
}

export async function GM모두처치(game: GameDriver): Promise<number> {
  await GM보내기(game, 'killall');
  const 알림 = new 알림띠(game);
  const 끝 = Date.now() + 5_000;
  let 글: string | undefined;
  while (글 === undefined && Date.now() < 끝) 글 = (await 알림.글들()).find((줄) => 줄.includes('[GM] killall'));
  const 수 = 글 === undefined ? undefined : /\[GM\] killall (\d+)/.exec(글)?.[1];
  if (수 === undefined) throw new Error('「[GM] killall N」 알림에서 잡은 수를 못 읽었습니다');
  return Number(수);
}

export async function GM보스처치(game: GameDriver): Promise<void> {
  await GM보내기(game, 'killboss');
}

export async function GM보스방가기(game: GameDriver): Promise<void> {
  await GM보내기(game, 'tp boss', 'tp boss 도착');
}

export async function GM스위치가기(game: GameDriver): Promise<void> {
  await GM보내기(game, 'tp switch');
}

export async function GM임프불러내기(game: GameDriver): Promise<void> {
  await GM보내기(game, 'spawn imp');
  await game.waitFor('/Imp(Clone)[-1]', { timeoutMs: 20_000 });
}

export async function GM던지는임프불러내기(game: GameDriver): Promise<void> {
  await GM보내기(game, 'spawn thrower');
}

export async function GM보스불러내기(game: GameDriver): Promise<void> {
  await GM보내기(game, 'spawn boss');
}

export async function GM항아리불러내기(game: GameDriver): Promise<void> {
  await GM보내기(game, 'spawn pot');
  await game.waitFor('/PickUpPot(Clone)', { timeoutMs: 10_000 });
}

export async function GM무적바꾸기(game: GameDriver): Promise<void> {
  await GM보내기(game, 'god');
}

export async function GM회복(game: GameDriver): Promise<void> {
  await GM보내기(game, 'heal');
}

export async function GM기절(game: GameDriver): Promise<void> {
  await GM보내기(game, 'faint');
}

export async function GM체력(game: GameDriver, 체력: number): Promise<void> {
  await GM보내기(game, `hp ${String(체력)}`);
}

export async function GM전리품(game: GameDriver, 아이템: string): Promise<void> {
  await GM보내기(game, `loot ${아이템}`);
}

export async function GM퀘스트리셋(game: GameDriver): Promise<void> {
  await GM보내기(game, 'quest reset');
}

export async function GM퀘스트완료(game: GameDriver): Promise<void> {
  await GM보내기(game, 'quest done');
}

export type 스탯 = Record<string, string>;

export async function GM스탯(game: GameDriver): Promise<스탯> {
  const 창 = await GM보내기(game, 'stat');
  const 열려있나 = await 채팅창.열려있나(game);
  const 읽을창 = 열려있나 ? 창 : await 채팅창.열기(game);
  const 줄들 = (await 읽을창.최근줄들(3)).map(색글떼기).reverse();
  if (!열려있나) await 읽을창.닫기();
  const 값: 스탯 = {};
  for (const 줄 of 줄들) {
    const 몸 = 줄.split('[GM] stat ')[1];
    if (몸 === undefined) continue;
    for (const 짝 of 몸.matchAll(/(\S+?)=(.*?)(?=\s+\S+?=|$)/g)) {
      const [, 키, 글] = 짝;
      if (키 !== undefined && 글 !== undefined) 값[키] = 글.trim();
    }
  }
  if (Object.keys(값).length === 0) throw new Error('GM stat 값 줄을 못 읽었습니다');
  return 값;
}

export function 스탯숫자(값: 스탯, 키: string): number {
  const 글 = 값[키];
  if (글 === undefined) throw new Error(`GM stat 에 「${키}」 칸이 없습니다 — 받은 칸: ${Object.keys(값).join(', ')}`);
  return Number(글.split('/')[0]);
}

export function 스탯기본숫자(값: 스탯, 키: string): number {
  const 글 = 값[키];
  const 뒤 = 글?.split('/')[1];
  if (뒤 === undefined) throw new Error(`GM stat 「${키}」 칸에 「지금/기본」 꼴의 기본 값이 없습니다 — 받은 글: ${String(글)}`);
  return Number(뒤);
}

export type 데이터종류 = 'skill' | 'monster' | 'item' | 'bag';

export async function GM데이터(game: GameDriver, 종류: 데이터종류): Promise<string[]> {
  await GM보내기(game, `data ${종류}`);
  const 창 = await 채팅창.열기(game);
  const 끝줄 = await 창.줄기다리기((글) => 글.includes(`[GM] data ${종류} 끝`), 1, 10_000);
  if (끝줄 === null) throw new Error(`GM data ${종류} 의 「끝」 줄을 못 읽었습니다`);
  const 모은: string[] = [];
  for (const 줄 of (await 창.최근줄들(30)).slice(1)) {
    const 글 = 색글떼기(줄);
    const 머리 = `[GM] data ${종류} `;
    if (!글.includes(머리) || 글.includes(`${머리}끝`)) break;
    모은.push(글.split(머리)[1] ?? '');
  }
  await 창.닫기();
  return 모은.reverse();
}
