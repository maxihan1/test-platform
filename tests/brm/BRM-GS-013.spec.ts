import { defineCase, test, verify } from "@platform/kit";
import { z } from "zod";

import { 로비로 } from "./helpers/game-enter.helper.js";
import {
  GM상태,
  계정꺼내기,
  계정되돌리기,
  골드맞추기,
  레벨맞추기,
  봇모두끄기,
  퀘스트처음으로,
} from "./helpers/game-state.helper.js";
import { 사기 } from "./helpers/items-tools.helper.js";
import {
  못닿음,
  보상받고차이읽기,
  type 보상결과,
  스탯숫자,
  완료알림봄,
  퀘스트상태,
} from "./helpers/quest-flow.helper.js";

const 퀘스트 = "상점에서 물건 구매";

export const spec = defineCase({
  tcId: "BRM-GS-013",
  name: "레벨 1 일반 회원이 로비 상점에서 「체력 물약」을 실제로 사 「상점에서 물건 구매」 퀘스트를 끝내고 보상을 받으면 완료 알림 · 보상이 기획서대로다",
  platforms: ["android"],
  precondition: ["레벨 1 · 골드 200 · 로비 · 오늘 퀘스트 처음 상태"],
  elements: [
    "quest:상점에서 물건 구매",
    "shop:체력 물약",
    "item:체력 물약",
    "level:1",
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
  await test.cleanup(
    "켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기",
    async () => {
      await 봇모두끄기(admin);
      await 계정되돌리기(admin, 나);
    },
  );
  await test.step("일반 회원으로 로비에 들어가 레벨 1 · 골드 200 · 오늘 퀘스트 처음 상태로 맞춘다", async () => {
    await 로비로(game, driver, 나);
    await 레벨맞추기(game, 1);
    await 골드맞추기(game, 200);
    await 퀘스트처음으로(game);
    const 값 = await GM상태(game);
    await verify("/gm stat 레벨이 1 이다", 스탯숫자(값, "레벨"), 1, {
      blocker: true,
    });
    await verify("/gm stat 골드가 200 이다", 스탯숫자(값, "골드"), 200, {
      blocker: true,
    });
  });
  await test.step("로비 상점에서 「체력 물약」을 사고 「상점에서 물건 구매」 보상을 받는다", async () => {
    let 처음: { 진행: string; 받기눌림: boolean } | undefined;
    let 알림: boolean | undefined;
    let 채움: { 진행: string; 받기눌림: boolean } | undefined;
    let 보상: 보상결과 | undefined;
    let 멈춤: unknown;
    try {
      처음 = await 퀘스트상태(game, 퀘스트);
      await 사기(game, "체력 물약");
      알림 = await 완료알림봄(game, 퀘스트, 10_000);
      채움 = await 퀘스트상태(game, 퀘스트);
      보상 = await 보상받고차이읽기(game, [퀘스트]);
    } catch (e) {
      멈춤 = e;
    }
    await verify(
      "BRM-REQ-225 사기 전(0/1)에는 「보상 받기」가 눌리지 않는다",
      처음?.받기눌림 ?? 못닿음,
      false,
    );
    await verify(
      "BRM-REQ-224 「체력 물약」을 사는 순간 「퀘스트 완료: 상점에서 물건 구매 — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다",
      알림 ?? 못닿음,
      true,
    );
    await verify(
      "BRM-REQ-225 진행이 「1/1」이면 「보상 받기」가 눌린다",
      채움 === undefined ? 못닿음 : 채움.진행 === "1/1" && 채움.받기눌림,
      true,
    );
    await verify(
      "BRM-REQ-358 보상 받기 앞뒤 골드 차이는 50 · 경험치 차이는 50 이다",
      보상 === undefined ? 못닿음 : { 골드: 보상.골드, 경험치: 보상.경험치 },
      { 골드: 50, 경험치: 50 },
    );
    await verify(
      "BRM-REQ-228 보상을 받은 뒤에는 「보상 받기」가 다시 눌리지 않는다",
      보상?.다시눌림 ?? 못닿음,
      false,
    );
    if (멈춤 !== undefined) throw 멈춤;
  });
});
