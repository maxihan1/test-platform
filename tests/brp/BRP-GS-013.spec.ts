import { defineCase, gameLog, repeatUntil, test, verify } from "@platform/kit";
import { z } from "zod";

import { 던전입장, 로그인하기 } from "./helpers/game-enter.helper.js";
import {
  type 로그줄,
  설명안되는줄,
  처치줄,
} from "./helpers/game-log.helper.js";
import { 계정되돌리기, 로비로되돌리기 } from "./helpers/game-state.helper.js";
import { GM스탯, 스탯숫자 } from "./helpers/gm.helper.js";
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
  완료알림봄,
  퀘스트상태,
} from "./helpers/quest-flow.helper.js";
import { 던전화면 } from "./pages/dungeon.page.js";

const 퀘스트 = "임프 30마리 처치";

export const spec = defineCase({
  tcId: "BRP-GS-013",
  name: "레벨 1 탱커가 임프 30마리를 실제로 잡아 「임프 30마리 처치」 퀘스트를 끝내고 보상을 받으면 진행 · 완료 알림 · 보상이 기획서대로다",
  platforms: ["windows"],
  precondition: [
    "탱커 · 레벨 1 · 장비 없음 · 파티 없음 · 혼자 · 무적 · 오늘 퀘스트 처음 상태 · 던전의 임프는 치움",
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

  await test.step("탱커 · 레벨 1 · 무적으로 혼자 던전에 들어와 임프를 치우고 오늘 퀘스트를 처음으로 돌린 것을 확인한다", async () => {
    await 장비갖추기(game, 1, null);
    await 던전입장(game, "탱커");
    await 던전을비우고레벨맞추기(game, 1);
    const 진행 = await 퀘스트처음으로(game);
    await 무적켜기(game);
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

  const 던전 = await 던전화면.열림(game);
  const 로그 = await gameLog(내로그(admin, 아이디));
  await test.step("불러낸 임프를 하나씩 공격해 30마리 처치하고 31마리째도 잡은 뒤 「임프 30마리 처치」 보상을 받는다", async () => {
    let 처음: { 진행: string; 받기눌림: boolean } | undefined;
    let 줄들: 로그줄[] = [];
    let 알림 = false;
    let 채움: { 진행: string; 받기눌림: boolean } | undefined;
    let 넘김: string | undefined;
    let 보상: 보상결과 | undefined;
    let 멈춤: unknown;
    try {
      처음 = await 퀘스트상태(game, 퀘스트);
      await repeatUntil(
        async () => {
          await 임프몇초치기(game, 던전, "공격");
          if (!알림 && 처치줄(줄들, 아이디, "Imp").length >= 29)
            알림 = await 완료알림봄(game, 퀘스트, 1_500);
        },
        {
          progress: async () =>
            처치줄((줄들 = await 로그.lines()), 아이디, "Imp").length,
          goal: 30,
          stallMs: 60_000,
        },
      );
      if (!알림) 알림 = await 완료알림봄(game, 퀘스트, 1_500);
      채움 = await 퀘스트상태(game, 퀘스트);
      await repeatUntil(() => 임프몇초치기(game, 던전, "공격"), {
        progress: async () =>
          처치줄((줄들 = await 로그.lines()), 아이디, "Imp").length,
        goal: 31,
        stallMs: 60_000,
      });
      넘김 = (await 퀘스트상태(game, 퀘스트)).진행;
      보상 = await 보상받고차이읽기(game, [퀘스트]);
    } catch (e) {
      멈춤 = e;
    }
    const 다 = 채움 !== undefined;
    await verify(
      "BRP-REQ-225 임프를 잡기 전(0/30)에는 「보상 받기」가 눌리지 않는다",
      처음?.받기눌림 ?? 못닿음,
      false,
    );
    await verify(
      "BRP-REQ-224 30마리째를 잡는 순간 「퀘스트 완료: 임프 30마리 처치 — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다",
      다 ? 알림 : 못닿음,
      true,
    );
    await verify(
      "BRP-REQ-223 임프 30마리를 잡으면 진행이 「30/30」이다",
      채움?.진행 ?? 못닿음,
      "30/30",
    );
    await verify(
      "BRP-REQ-225 진행이 「30/30」이면 「보상 받기」가 눌린다",
      채움?.받기눌림 ?? 못닿음,
      true,
    );
    await verify(
      "BRP-REQ-222 31마리째를 잡아도 진행은 「30/30」이다",
      넘김 ?? 못닿음,
      "30/30",
    );
    await verify(
      "BRP-REQ-358 보상 받기 앞뒤 골드 차이는 150 · 경험치 차이는 200 이다",
      보상 === undefined ? 못닿음 : { 골드: 보상.골드, 경험치: 보상.경험치 },
      { 골드: 150, 경험치: 200 },
    );
    await verify(
      "BRP-REQ-228 보상을 받은 뒤에는 「보상 받기」가 다시 눌리지 않는다",
      보상?.다시눌림 ?? 못닿음,
      false,
    );
    for (const 줄 of 설명안되는줄(줄들, 알려진줄(1)))
      await verify.note("설명 안 되는 줄", 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
