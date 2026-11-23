import { defineCase, gameLog, repeatUntil, test, verify } from "@platform/kit";
import { z } from "zod";

import { 던전으로, 지금화면 } from "./helpers/game-enter.helper.js";
import {
  GM상태,
  계정꺼내기,
  계정되돌리기,
  보스방가기,
  봇모두끄기,
  전리품원래대로,
  퀘스트처음으로,
} from "./helpers/game-state.helper.js";
import {
  type 로그줄,
  미션로그,
  설명안되는줄,
  적치우고레벨맞추기,
  처치마다전리품,
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
  완료알림봄,
  퀘스트상태,
  무적끄기,
  무적켜기,
} from "./helpers/quest-flow.helper.js";
import { 던전화면 } from "./pages/dungeon.page.js";

const 퀘스트 = "던전 보스 처치";
const 잡음 = Number.MAX_SAFE_INTEGER;

export const spec = defineCase({
  tcId: "BRM-GS-007",
  name: "레벨 30 탱커가 혼자 보스 임프를 실제로 잡아 「던전 보스 처치」 퀘스트를 끝내고 보상을 받으면 처치 보상 · 전리품 · 완료 알림 · 퀘스트 보상이 기획서대로다",
  platforms: ["android"],
  precondition: [
    "탱커 · 레벨 30 · 장비 없음 · 혼자 던전 · 무적 · 전리품 원래 확률 · 오늘 퀘스트 처음 상태 · 보스 방",
  ],
  elements: [
    "monster:보스 임프",
    "rate:보스 경험치",
    "rate:보스 골드",
    "drop:보스 임프",
    "item:불꽃의 검",
    "item:용비늘 갑옷",
    "item:보스의 왕관 조각",
    "quest:던전 보스 처치",
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
  const 보스전리품 = ["불꽃의 검", "용비늘 갑옷", "보스의 왕관 조각"];
  await test.cleanup("켠 무적 끄기", () => 무적끄기(game));
  await test.cleanup(
    "켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기",
    async () => {
      await 봇모두끄기(admin);
      await 계정되돌리기(admin, 나);
    },
  );
  await test.step("탱커로 혼자 던전에 들어가 레벨 30 · 무적 · 전리품 원래 확률 · 오늘 퀘스트 처음 상태로 맞추고 보스 방에 간다", async () => {
    await 던전으로(game, driver, 나, 0);
    await verify("던전 화면이 보인다", await 지금화면(game), "던전", {
      blocker: true,
    });
    await 적치우고레벨맞추기(game, 30);
    await 전리품원래대로(game);
    await 퀘스트처음으로(game);
    await 무적켜기(game);
    await verify(
      "/gm stat 레벨이 30 이다",
      스탯숫자(await GM상태(game), "레벨"),
      30,
      { blocker: true },
    );
    await verify(
      "「던전 보스 처치」 진행이 「0/1」이다",
      (await 퀘스트상태(game, 퀘스트)).진행,
      "0/1",
      { blocker: true },
    );
    await 보스방가기(game);
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step("보스 방에서 보스 임프를 공격해 처치하고 로비에서 「던전 보스 처치」 보상을 받는다", async () => {
    const 던전 = await 던전화면.열기(game);
    let 처음: { 진행: string; 받기눌림: boolean } | undefined;
    let 줄들: 로그줄[] = [];
    let 알림: boolean | undefined;
    let 채움: { 진행: string; 받기눌림: boolean } | undefined;
    let 보상: 보상결과 | undefined;
    let 멈춤: unknown;
    try {
      처음 = await 퀘스트상태(game, 퀘스트);
      await repeatUntil(
        async () => {
          await 보스몇초치기(game, 던전);
          if (알림 !== true) 알림 = await 완료알림봄(game, 퀘스트, 300);
        },
        {
          progress: async () => {
            줄들 = await 로그.lines();
            return 처치줄(줄들, 나.아이디, "ImpBoss").length > 0
              ? 잡음
              : 보스에준피해(줄들, 나.아이디).length;
          },
          goal: 잡음,
          stallMs: 60_000,
        },
      );
      if (알림 !== true) 알림 = await 완료알림봄(game, 퀘스트, 3_000);
      await 결과뒤로비까지(game);
      채움 = await 퀘스트상태(game, 퀘스트);
      보상 = await 보상받고차이읽기(game, [퀘스트]);
    } catch (e) {
      멈춤 = e;
    }
    const 처치 = 처치줄(줄들, 나.아이디, "ImpBoss");
    const 전리품 = 처치마다전리품(줄들, 나.아이디, "ImpBoss");
    const 경험치 = await verify.log(
      "보스 처치 줄 경험치가 전부 300 이다",
      처치.map((줄) => 줄.exp),
      300,
    );
    const 골드 = await verify.log(
      "보스 처치 줄 골드가 전부 200 이다",
      처치.map((줄) => 줄.gold),
      200,
    );
    const 개수 = await verify.log(
      "보스 처치마다 아이템 줄이 1줄이다",
      전리품.map((x) => x.length),
      1,
    );
    const 목록안 = await verify.log(
      "보스 처치 아이템 줄이 기획서 전리품 셋 가운데 하나다",
      전리품.flat().map((x) => (보스전리품.includes(x) ? 1 : 0)),
      1,
    );
    await verify(
      "BRM-REQ-124 혼자 장비 없이 잡은 보스 처치 경험치는 300 이다",
      경험치,
      true,
    );
    await verify(
      "BRM-REQ-131 장비 없이 잡은 보스 처치 골드는 200 이다",
      골드,
      true,
    );
    await verify(
      "BRM-REQ-132 보스 처치로 받은 전리품 줄은 1줄이다",
      개수,
      true,
    );
    await verify(
      "BRM-REQ-133 보스 처치 전리품은 「불꽃의 검」 · 「용비늘 갑옷」 · 「보스의 왕관 조각」 가운데 하나다",
      목록안,
      true,
    );
    await verify(
      "BRM-REQ-225 보스를 잡기 전(0/1)에는 「보상 받기」가 눌리지 않는다",
      처음?.받기눌림 ?? 못닿음,
      false,
    );
    await verify(
      "BRM-REQ-224 보스를 잡는 순간 「퀘스트 완료: 던전 보스 처치 — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다",
      알림 ?? 못닿음,
      true,
    );
    await verify(
      "BRM-REQ-225 진행이 「1/1」이면 「보상 받기」가 눌린다",
      채움 === undefined ? 못닿음 : 채움.진행 === "1/1" && 채움.받기눌림,
      true,
    );
    await verify(
      "BRM-REQ-358 보상 받기 앞뒤 골드 차이는 300 · 경험치 차이는 400 이다",
      보상 === undefined ? 못닿음 : { 골드: 보상.골드, 경험치: 보상.경험치 },
      { 골드: 300, 경험치: 400 },
    );
    await verify(
      "BRM-REQ-228 보상을 받은 뒤에는 「보상 받기」가 다시 눌리지 않는다",
      보상?.다시눌림 ?? 못닿음,
      false,
    );
    const 조건 = { 레벨: 30, 직업: "탱커", 무기: "-", 갑옷: "-", 인원: 1 };
    for (const 줄 of 설명안되는줄(줄들, 나.아이디, 조건, [
      "hit",
      "kill",
      "item",
      "levelup",
    ]).slice(0, 10))
      await verify.note("설명 안 되는 줄", 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
