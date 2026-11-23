import type { GameDriver } from "@platform/kit";

import { 던전화면 } from "../pages/dungeon.page.js";
import { 퀘스트창 } from "../pages/quest.page.js";
import { 준피해, type 로그줄 } from "./game-log.helper.js";
import { GM무적바꾸기, GM스탯, 스탯숫자, type 스탯 } from "./gm.helper.js";
import { 알림글읽기 } from "./items.helper.js";

export const 보스주소 = "/ImpBoss(Clone)";

export const 못닿음 = "미션이 목표에 못 닿아 확인 못 함";

export async function 보스몇초치기(
  game: GameDriver,
  던전: 던전화면,
  초 = 2,
): Promise<void> {
  const 끝 = Date.now() + 초 * 1000;
  while (Date.now() < 끝 && (await game.find(보스주소)) !== null) {
    try {
      await 던전.대상고르기(보스주소);
    } catch (e) {
      if (e instanceof Error && e.message.includes("없습니다")) continue;
      throw e;
    }
    await 던전.공격누르기();
  }
}

export async function 무적켜기(game: GameDriver): Promise<void> {
  for (let 번 = 0; 번 < 2; 번 += 1) {
    await GM무적바꾸기(game);
    if ((await 알림글읽기(game, "[GM] god on", 3_000)) !== null) return;
  }
  throw new Error(
    "「/gm god」을 두 번 보내도 「[GM] god on」 알림이 안 떴습니다",
  );
}

export async function 무적끄기(game: GameDriver): Promise<void> {
  if ((await game.find("/Showcase HUD/PlayerBar")) === null) return;
  for (let 번 = 0; 번 < 2; 번 += 1) {
    await GM무적바꾸기(game);
    if ((await 알림글읽기(game, "[GM] god off", 3_000)) !== null) return;
  }
  throw new Error(
    "「/gm god」을 두 번 보내도 「[GM] god off」 알림이 안 떴습니다",
  );
}

export function 보스에준피해(줄들: 로그줄[], 아이디: string): 로그줄[] {
  return 준피해(줄들, 아이디).filter((l) => l.to?.["npc"] === "ImpBoss");
}

export function 누적경험치(값: 스탯): number {
  let 합 = 스탯숫자(값, "경험치");
  for (let 레벨 = 1; 레벨 < 스탯숫자(값, "레벨"); 레벨 += 1)
    합 += Math.floor(100 * 레벨 ** 1.5);
  return 합;
}

export async function 퀘스트상태(
  game: GameDriver,
  이름: string,
): Promise<{ 진행: string; 받기눌림: boolean }> {
  const 창 = await 퀘스트창.열기(game);
  const 진행 = await 창.진행글(이름);
  const 받기눌림 = (await 창.받기눌림(이름)) === true;
  await 창.닫기();
  return { 진행, 받기눌림 };
}

export async function 완료알림봄(
  game: GameDriver,
  이름: string,
  한도ms = 3_000,
): Promise<boolean> {
  const 글 = await 알림글읽기(game, `퀘스트 완료: ${이름}`, 한도ms);
  return 글 !== null && 글.includes("퀘스트 창에서 보상을 받으세요");
}

export interface 보상결과 {
  골드: number;
  경험치: number;
  다시눌림: boolean;
}

export async function 보상받고차이읽기(
  game: GameDriver,
  이름들: string[],
): Promise<보상결과> {
  const 전 = await GM스탯(game);
  const 창 = await 퀘스트창.열기(game);
  for (const 이름 of 이름들) {
    await 창.보상받기(이름);
    if (!(await 창.받음이될때까지(이름)))
      throw new Error(
        `「${이름}」 보상을 눌렀는데 10초 안에 「받음」이 안 됐습니다`,
      );
  }
  let 다시눌림 = false;
  for (const 이름 of 이름들)
    if ((await 창.받기눌림(이름)) === true) 다시눌림 = true;
  await 창.닫기();
  const 후 = await GM스탯(game);
  return {
    골드: 스탯숫자(후, "골드") - 스탯숫자(전, "골드"),
    경험치: 누적경험치(후) - 누적경험치(전),
    다시눌림,
  };
}
