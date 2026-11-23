import { defineCase, test, verify } from "@platform/kit";
import { z } from "zod";

import { 로그인하기 } from "./helpers/game-enter.helper.js";
import { 계정되돌리기 } from "./helpers/game-state.helper.js";
import { GM레벨, GM스탯, 스탯숫자 } from "./helpers/gm.helper.js";
import { 골드맞추기, 퀘스트처음으로 } from "./helpers/items.helper.js";
import {
  못닿음,
  보상받고차이읽기,
  type 보상결과,
  완료알림봄,
  퀘스트상태,
} from "./helpers/quest-flow.helper.js";
import { 상점창 } from "./pages/shop.page.js";

const 퀘스트 = "상점에서 물건 구매";

export const spec = defineCase({
  tcId: "BRP-GS-014",
  name: "레벨 1 일반 회원이 로비 상점에서 「조약돌」을 실제로 사 「상점에서 물건 구매」 퀘스트를 끝내고 보상을 받으면 완료 알림 · 보상이 기획서대로다",
  platforms: ["windows"],
  precondition: ["레벨 1 · 골드 200 · 로비 · 오늘 퀘스트 처음 상태"],
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
  await test.cleanup("일반 회원을 기준 상태로 되돌리기", () =>
    계정되돌리기(admin, 아이디, 비밀번호, "base"),
  );

  await test.step("일반 회원으로 로그인해 로비가 뜬 것을 확인한다", async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify("로비 화면이 열린다", 로비 !== null, true, { blocker: true });
  });

  await test.step("레벨 1 · 골드 200 이고 오늘 퀘스트를 처음으로 돌린 것을 확인한다", async () => {
    await GM레벨(game, 1);
    await verify("골드가 200 이다", await 골드맞추기(game, 200), true, {
      blocker: true,
    });
    const 진행 = await 퀘스트처음으로(game);
    await verify(
      "/gm stat 레벨이 1 이다",
      스탯숫자(await GM스탯(game), "레벨"),
      1,
      { blocker: true },
    );
    await verify(
      "일일 퀘스트 진행이 모두 0 이다",
      진행.split(" · ").every((칸) => 칸.startsWith("0/")),
      true,
      { blocker: true },
    );
  });

  await test.step("로비 상점에서 「조약돌」을 사고 「상점에서 물건 구매」 보상을 받는다", async () => {
    let 처음: { 진행: string; 받기눌림: boolean } | undefined;
    let 알림: boolean | undefined;
    let 채움: { 진행: string; 받기눌림: boolean } | undefined;
    let 보상: 보상결과 | undefined;
    let 멈춤: unknown;
    try {
      처음 = await 퀘스트상태(game, 퀘스트);
      const 상점 = await 상점창.열기(game);
      await 상점.구매하기("조약돌");
      알림 = await 완료알림봄(game, 퀘스트, 10_000);
      await 상점.닫기();
      채움 = await 퀘스트상태(game, 퀘스트);
      보상 = await 보상받고차이읽기(game, [퀘스트]);
    } catch (e) {
      멈춤 = e;
    }
    await verify(
      "BRP-REQ-225 사기 전(0/1)에는 「보상 받기」가 눌리지 않는다",
      처음?.받기눌림 ?? 못닿음,
      false,
    );
    await verify(
      "BRP-REQ-224 「조약돌」을 사는 순간 「퀘스트 완료: 상점에서 물건 구매 — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다",
      알림 ?? 못닿음,
      true,
    );
    await verify(
      "BRP-REQ-225 진행이 「1/1」이면 「보상 받기」가 눌린다",
      채움 === undefined ? 못닿음 : 채움.진행 === "1/1" && 채움.받기눌림,
      true,
    );
    await verify(
      "BRP-REQ-358 보상 받기 앞뒤 골드 차이는 50 · 경험치 차이는 50 이다",
      보상 === undefined ? 못닿음 : { 골드: 보상.골드, 경험치: 보상.경험치 },
      { 골드: 50, 경험치: 50 },
    );
    await verify(
      "BRP-REQ-228 보상을 받은 뒤에는 「보상 받기」가 다시 눌리지 않는다",
      보상?.다시눌림 ?? 못닿음,
      false,
    );
    if (멈춤 !== undefined) throw 멈춤;
  });
});
