import { defineCase, gameLog, repeatUntil, test, verify } from "@platform/kit";
import { z } from "zod";

import { 던전입장, 로그인하기, 방로비로 } from "./helpers/game-enter.helper.js";
import {
  type 로그줄,
  설명안되는줄,
  처치줄,
} from "./helpers/game-log.helper.js";
import { 계정되돌리기, 로비로되돌리기 } from "./helpers/game-state.helper.js";
import { GM보스방가기, GM스탯, 스탯숫자 } from "./helpers/gm.helper.js";
import { 퀘스트처음으로 } from "./helpers/items.helper.js";
import {
  내로그,
  던전을비우고레벨맞추기,
  알려진줄,
  임프몇초치기,
  장비갖추기,
} from "./helpers/mission.helper.js";
import {
  못닿음,
  무적끄기,
  무적켜기,
  type 보상결과,
  보상받고차이읽기,
  보스몇초치기,
  보스에준피해,
} from "./helpers/quest-flow.helper.js";
import { 던전화면 } from "./pages/dungeon.page.js";
import { 결과화면 } from "./pages/postgame.page.js";
import { 퀘스트창 } from "./pages/quest.page.js";
import { 상점창 } from "./pages/shop.page.js";

const 세퀘스트 = ["임프 30마리 처치", "던전 보스 처치", "상점에서 물건 구매"];
const 잡음 = Number.MAX_SAFE_INTEGER;

export const spec = defineCase({
  tcId: "BRP-GS-016",
  name: "레벨 30 탱커가 하루 동안 상점 구매 · 임프 30마리 · 보스 처치를 실제로 해 세 일일 퀘스트를 모두 끝내고 보상을 받으면 하루 보상 합계가 기획서대로다",
  platforms: ["windows"],
  precondition: [
    "탱커 · 레벨 30 · 장비 없음 · 파티 없음 · 혼자 · 무적 · 오늘 퀘스트 처음 상태 · 던전의 임프는 치움",
  ],
  params: z.object({
    userId: z
      .string()
      .describe("일반 회원 아이디")
      .optional()
      .meta({ secret: true, account: "일반 회원" }),
    userPassword: z
      .string()
      .describe("일반 회원 비밀번호")
      .optional()
      .meta({ secret: true, account: "일반 회원" }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? "";
  const 비밀번호 = params.userPassword ?? "";
  await test.cleanup("켠 무적 끄기", () => 무적끄기(game));
  await test.cleanup(
    "방을 로비로 돌리고 계정을 기준 상태로 되돌리기",
    async () => {
      await 로비로되돌리기(admin);
      await 계정되돌리기(admin, 아이디, 비밀번호, "base");
    },
  );

  await test.step("일반 회원으로 로그인해 로비가 뜬 것을 확인한다", async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify("로비 화면이 열린다", 로비 !== null, true, { blocker: true });
  });

  await test.step("탱커 · 레벨 30 · 무적으로 혼자 던전에 들어와 임프를 치우고 오늘 퀘스트를 처음으로 돌린 것을 확인한다", async () => {
    await 장비갖추기(game, 30, null);
    await 던전입장(game, "탱커");
    await 던전을비우고레벨맞추기(game, 30);
    const 진행 = await 퀘스트처음으로(game);
    await 무적켜기(game);
    await verify(
      "/gm stat 레벨이 30 이다",
      스탯숫자(await GM스탯(game), "레벨"),
      30,
      { blocker: true },
    );
    await verify(
      "일일 퀘스트 진행이 모두 0 이다",
      진행.split(" · ").every((칸) => 칸.startsWith("0/")),
      true,
      { blocker: true },
    );
  });

  const 던전 = await 던전화면.열림(game);
  const 로그 = await gameLog(내로그(admin, 아이디));
  await test.step("상점에서 「조약돌」을 사고 임프 30마리 · 보스 임프를 잡은 뒤 로비에서 세 퀘스트 보상을 모두 받는다", async () => {
    let 줄들: 로그줄[] = [];
    let 다채움: boolean | undefined;
    let 보상: 보상결과 | undefined;
    let 멈춤: unknown;
    try {
      const 상점 = await 상점창.열기(game);
      await 상점.구매하기("조약돌");
      await 상점.닫기();
      await repeatUntil(() => 임프몇초치기(game, 던전, "공격"), {
        progress: async () =>
          처치줄((줄들 = await 로그.lines()), 아이디, "Imp").length,
        goal: 30,
        stallMs: 60_000,
      });
      await GM보스방가기(game);
      await repeatUntil(() => 보스몇초치기(game, 던전), {
        progress: async () => {
          줄들 = await 로그.lines();
          return 처치줄(줄들, 아이디, "ImpBoss").length > 0
            ? 잡음
            : 보스에준피해(줄들, 아이디).length;
        },
        goal: 잡음,
        stallMs: 60_000,
      });
      await 결과화면.뜰때까지(game, 30_000);
      await 방로비로(admin, game);
      const 창 = await 퀘스트창.열기(game);
      const 받기들 = [];
      for (const 이름 of 세퀘스트)
        받기들.push((await 창.받기눌림(이름)) === true);
      await 창.닫기();
      다채움 = 받기들.every(Boolean);
      보상 = await 보상받고차이읽기(game, 세퀘스트);
    } catch (e) {
      멈춤 = e;
    }
    await verify(
      "BRP-REQ-225 세 퀘스트 목표를 모두 채우면 세 줄 모두 「보상 받기」가 눌린다",
      다채움 ?? 못닿음,
      true,
    );
    await verify(
      "BRP-REQ-359 세 퀘스트 보상을 모두 받은 앞뒤 골드 차이는 150 + 300 + 50 = 500 · 경험치 차이는 200 + 400 + 50 = 650 이다",
      보상 === undefined ? 못닿음 : { 골드: 보상.골드, 경험치: 보상.경험치 },
      { 골드: 150 + 300 + 50, 경험치: 200 + 400 + 50 },
    );
    for (const 줄 of 설명안되는줄(줄들, 알려진줄(1)))
      await verify.note("설명 안 되는 줄", 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
