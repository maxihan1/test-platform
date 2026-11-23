import { defineCase, gameLog, repeatUntil, test, verify } from "@platform/kit";
import { z } from "zod";

import { 던전으로, 지금화면 } from "./helpers/game-enter.helper.js";
import {
  GM상태,
  계정꺼내기,
  계정되돌리기,
  보스방가기,
  봇모두끄기,
  퀘스트처음으로,
} from "./helpers/game-state.helper.js";
import { 사기 } from "./helpers/items-tools.helper.js";
import {
  type 로그줄,
  미션로그,
  임프있게하기,
  적치우고레벨맞추기,
  처치줄,
} from "./helpers/mission-log.helper.js";
import {
  결과뒤로비까지,
  못닿음,
  보상받고차이읽기,
  type 보상결과,
  보스몇초치기,
  보스에준피해,
  스탯숫자,
  퀘스트상태,
  무적끄기,
  무적켜기,
} from "./helpers/quest-flow.helper.js";
import { 던전화면 } from "./pages/dungeon.page.js";

const 세퀘스트 = ["임프 30마리 처치", "던전 보스 처치", "상점에서 물건 구매"];
const 잡음 = Number.MAX_SAFE_INTEGER;

export const spec = defineCase({
  tcId: "BRM-GS-015",
  name: "레벨 30 탱커가 하루 동안 상점 구매 · 임프 30마리 · 보스 처치를 실제로 해 세 일일 퀘스트를 모두 끝내고 보상을 받으면 하루 보상 합계가 기획서대로다",
  platforms: ["android"],
  precondition: [
    "탱커 · 레벨 30 · 장비 없음 · 혼자 던전 · 무적 · 오늘 퀘스트 처음 상태 · 던전의 임프는 치움",
  ],
  elements: [
    "quest:임프 30마리 처치",
    "quest:던전 보스 처치",
    "quest:상점에서 물건 구매",
    "monster:임프",
    "monster:보스 임프",
    "shop:체력 물약",
    "level:30",
  ],
  params: z.object({
    loginId: z
      .string()
      .describe("일반 회원 아이디")
      .optional()
      .meta({ secret: true }),
    loginPassword: z
      .string()
      .describe("일반 회원 비밀번호")
      .optional()
      .meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup("켠 무적 끄기", () => 무적끄기(game));
  await test.cleanup(
    "켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기",
    async () => {
      await 봇모두끄기(admin);
      await 계정되돌리기(admin, 나);
    },
  );
  await test.step("탱커로 혼자 던전에 들어가 적을 치우고 레벨 30 · 무적 · 오늘 퀘스트 처음 상태로 맞춘다", async () => {
    await 던전으로(game, driver, 나, 0);
    await verify("던전 화면이 보인다", await 지금화면(game), "던전", {
      blocker: true,
    });
    await 적치우고레벨맞추기(game, 30);
    await 퀘스트처음으로(game);
    await 무적켜기(game);
    await verify(
      "/gm stat 레벨이 30 이다",
      스탯숫자(await GM상태(game), "레벨"),
      30,
      { blocker: true },
    );
    await verify(
      "「임프 30마리 처치」 진행이 「0/30」이다",
      (await 퀘스트상태(game, 세퀘스트[0] ?? "")).진행,
      "0/30",
      { blocker: true },
    );
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step("상점에서 「체력 물약」을 사고 임프 30마리 · 보스 임프를 잡은 뒤 로비에서 세 퀘스트 보상을 모두 받는다", async () => {
    const 던전 = await 던전화면.열기(game);
    let 줄들: 로그줄[] = [];
    let 다채움: boolean | undefined;
    let 보상: 보상결과 | undefined;
    let 멈춤: unknown;
    try {
      await 사기(game, "체력 물약");
      await repeatUntil(
        async () => {
          await 임프있게하기(game);
          await 던전.첫임프치기();
        },
        {
          progress: async () =>
            처치줄((줄들 = await 로그.lines()), 나.아이디, "Imp").length,
          goal: 30,
          stallMs: 60_000,
        },
      );
      await 보스방가기(game);
      await repeatUntil(() => 보스몇초치기(game, 던전), {
        progress: async () => {
          줄들 = await 로그.lines();
          return 처치줄(줄들, 나.아이디, "ImpBoss").length > 0
            ? 잡음
            : 보스에준피해(줄들, 나.아이디).length;
        },
        goal: 잡음,
        stallMs: 60_000,
      });
      await 결과뒤로비까지(game);
      const 상태들 = [];
      for (const 이름 of 세퀘스트) 상태들.push(await 퀘스트상태(game, 이름));
      다채움 = 상태들.every((x) => x.받기눌림);
      보상 = await 보상받고차이읽기(game, 세퀘스트);
    } catch (e) {
      멈춤 = e;
    }
    await verify(
      "BRM-REQ-225 세 퀘스트 목표를 모두 채우면 세 줄 모두 「보상 받기」가 눌린다",
      다채움 ?? 못닿음,
      true,
    );
    await verify(
      "BRM-REQ-359 세 퀘스트 보상을 모두 받은 앞뒤 골드 차이는 150 + 300 + 50 = 500 · 경험치 차이는 200 + 400 + 50 = 650 이다",
      보상 === undefined ? 못닿음 : { 골드: 보상.골드, 경험치: 보상.경험치 },
      { 골드: 150 + 300 + 50, 경험치: 200 + 400 + 50 },
    );
    for (const 줄 of 줄들
      .filter(
        (l) =>
          !["hit", "kill", "item", "levelup", "heal"].includes(l.kind) ||
          l.players !== 1,
      )
      .slice(0, 10))
      await verify.note("설명 안 되는 줄", 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
