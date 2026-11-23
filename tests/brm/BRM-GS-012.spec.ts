import { defineCase, gameLog, repeatUntil, test, verify } from "@platform/kit";
import { z } from "zod";

import { 던전으로, 지금화면 } from "./helpers/game-enter.helper.js";
import {
  GM상태,
  계정꺼내기,
  계정되돌리기,
  봇모두끄기,
  퀘스트처음으로,
} from "./helpers/game-state.helper.js";
import {
  type 로그줄,
  미션로그,
  임프있게하기,
  적치우고레벨맞추기,
  처치줄,
} from "./helpers/mission-log.helper.js";
import {
  못닿음,
  보상받고차이읽기,
  type 보상결과,
  스탯숫자,
  완료알림봄,
  퀘스트상태,
  무적끄기,
  무적켜기,
} from "./helpers/quest-flow.helper.js";
import { 던전화면 } from "./pages/dungeon.page.js";

const 퀘스트 = "임프 30마리 처치";

export const spec = defineCase({
  tcId: "BRM-GS-012",
  name: "레벨 1 탱커가 임프 30마리를 실제로 잡아 「임프 30마리 처치」 퀘스트를 끝내고 보상을 받으면 진행 · 완료 알림 · 보상이 기획서대로다",
  platforms: ["android"],
  precondition: [
    "탱커 · 레벨 1 · 장비 없음 · 혼자 던전 · 무적 · 오늘 퀘스트 처음 상태 · 던전의 임프는 치움",
  ],
  elements: [
    "monster:임프",
    "quest:임프 30마리 처치",
    "level:1",
    "state:직업=탱커",
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
  await test.step("탱커로 혼자 던전에 들어가 적을 치우고 레벨 1 · 무적 · 오늘 퀘스트 처음 상태로 맞춘다", async () => {
    await 던전으로(game, driver, 나, 0);
    await verify("던전 화면이 보인다", await 지금화면(game), "던전", {
      blocker: true,
    });
    await 적치우고레벨맞추기(game, 1);
    await 퀘스트처음으로(game);
    await 무적켜기(game);
    await verify(
      "/gm stat 레벨이 1 이다",
      스탯숫자(await GM상태(game), "레벨"),
      1,
      { blocker: true },
    );
    await verify(
      "「임프 30마리 처치」 진행이 「0/30」이다",
      (await 퀘스트상태(game, 퀘스트)).진행,
      "0/30",
      { blocker: true },
    );
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step("불러낸 임프를 하나씩 공격해 30마리 처치하고 31마리째도 잡은 뒤 「임프 30마리 처치」 보상을 받는다", async () => {
    const 던전 = await 던전화면.열기(game);
    let 처음: { 진행: string; 받기눌림: boolean } | undefined;
    let 줄들: 로그줄[] = [];
    let 알림 = false;
    let 채움: { 진행: string; 받기눌림: boolean } | undefined;
    let 넘김: string | undefined;
    let 보상: 보상결과 | undefined;
    let 멈춤: unknown;
    const 한마리 = async (): Promise<void> => {
      await 임프있게하기(game);
      await 던전.첫임프치기();
    };
    try {
      처음 = await 퀘스트상태(game, 퀘스트);
      await repeatUntil(
        async () => {
          await 한마리();
          if (!알림 && 처치줄(줄들, 나.아이디, "Imp").length >= 29)
            알림 = await 완료알림봄(game, 퀘스트, 1_500);
        },
        {
          progress: async () =>
            처치줄((줄들 = await 로그.lines()), 나.아이디, "Imp").length,
          goal: 30,
          stallMs: 60_000,
        },
      );
      if (!알림) 알림 = await 완료알림봄(game, 퀘스트, 1_500);
      채움 = await 퀘스트상태(game, 퀘스트);
      await repeatUntil(한마리, {
        progress: async () =>
          처치줄((줄들 = await 로그.lines()), 나.아이디, "Imp").length,
        goal: 31,
        stallMs: 60_000,
      });
      넘김 = (await 퀘스트상태(game, 퀘스트)).진행;
      보상 = await 보상받고차이읽기(game, [퀘스트]);
    } catch (e) {
      멈춤 = e;
    }
    await verify(
      "BRM-REQ-225 임프를 잡기 전(0/30)에는 「보상 받기」가 눌리지 않는다",
      처음?.받기눌림 ?? 못닿음,
      false,
    );
    await verify(
      "BRM-REQ-224 30마리째를 잡는 순간 「퀘스트 완료: 임프 30마리 처치 — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다",
      채움 === undefined ? 못닿음 : 알림,
      true,
    );
    await verify(
      "BRM-REQ-223 임프 30마리를 잡으면 진행이 「30/30」이다",
      채움?.진행 ?? 못닿음,
      "30/30",
    );
    await verify(
      "BRM-REQ-225 진행이 「30/30」이면 「보상 받기」가 눌린다",
      채움?.받기눌림 ?? 못닿음,
      true,
    );
    await verify(
      "BRM-REQ-222 31마리째를 잡아도 진행은 「30/30」이다",
      넘김 ?? 못닿음,
      "30/30",
    );
    await verify(
      "BRM-REQ-358 보상 받기 앞뒤 골드 차이는 150 · 경험치 차이는 200 이다",
      보상 === undefined ? 못닿음 : { 골드: 보상.골드, 경험치: 보상.경험치 },
      { 골드: 150, 경험치: 200 },
    );
    await verify(
      "BRM-REQ-228 보상을 받은 뒤에는 「보상 받기」가 다시 눌리지 않는다",
      보상?.다시눌림 ?? 못닿음,
      false,
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
