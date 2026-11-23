import { defineCase, gameLog, repeatUntil, test, verify } from "@platform/kit";
import { z } from "zod";

import { 큰글기다리기 } from "./helpers/dungeon.helper.js";
import { 던전입장, 로그인하기 } from "./helpers/game-enter.helper.js";
import {
  type 로그줄,
  설명안되는줄,
  처치줄,
} from "./helpers/game-log.helper.js";
import { 계정되돌리기, 로비로되돌리기 } from "./helpers/game-state.helper.js";
import { GM스탯, type 스탯, 스탯숫자 } from "./helpers/gm.helper.js";
import { 알림글읽기 } from "./helpers/items.helper.js";
import {
  내로그,
  던전을비우고레벨맞추기,
  알려진줄,
  임프몇초치기,
  장비갖추기,
} from "./helpers/mission.helper.js";
import { 못닿음 } from "./helpers/quest-flow.helper.js";
import { 던전화면 } from "./pages/dungeon.page.js";

export const spec = defineCase({
  tcId: "BRP-GS-015",
  name: "레벨 1 탱커가 임프를 실제로 잡아 처치 경험치가 쌓여 레벨 2 가 되면 오르는 때 · 알림 · 오른 뒤 값이 기획서대로다",
  platforms: ["windows"],
  precondition: [
    "탱커 · 레벨 1 · 경험치 0 · 장비 없음 · 파티 없음 · 혼자 · 던전의 임프는 치움",
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

  await test.step("탱커 · 레벨 1 · 경험치 0 으로 혼자 던전에 들어와 임프를 치운 것을 확인한다", async () => {
    await 장비갖추기(game, 1, null);
    await 던전입장(game, "탱커");
    await 던전을비우고레벨맞추기(game, 1);
    const 값 = await GM스탯(game);
    await verify("/gm stat 레벨이 1 이다", 스탯숫자(값, "레벨"), 1, {
      blocker: true,
    });
    await verify("/gm stat 경험치가 0 이다", 스탯숫자(값, "경험치"), 0, {
      blocker: true,
    });
  });

  const 던전 = await 던전화면.열림(game);
  const 로그 = await gameLog(내로그(admin, 아이디));
  await test.step("불러낸 임프를 하나씩 공격해 레벨 업 줄이 찍힐 때까지 처치", async () => {
    let 줄들: 로그줄[] = [];
    let 알림 = null as string | null;
    let 큰글 = false;
    let 뒤: 스탯 | undefined;
    let 멈춤: unknown;
    const 레벨업줄 = (): 로그줄[] =>
      줄들.filter((l) => l.kind === "levelup" && l.by?.["user"] === 아이디);
    try {
      await repeatUntil(
        async () => {
          await 임프몇초치기(game, 던전, "공격");
          if (!큰글) 큰글 = await 큰글기다리기(game, "레벨 업!", true, 300);
          if (알림 === null) 알림 = await 알림글읽기(game, "레벨 업! Lv.", 300);
        },
        {
          progress: async () => {
            줄들 = await 로그.lines();
            return 레벨업줄().length;
          },
          goal: 1,
          stallMs: 90_000,
        },
      );
      if (!큰글) 큰글 = await 큰글기다리기(game, "레벨 업!", true, 2_000);
      if (알림 === null) 알림 = await 알림글읽기(game, "레벨 업! Lv.", 2_000);
      뒤 = await GM스탯(game);
    } catch (e) {
      멈춤 = e;
    }
    const 오른곳 = 줄들.findIndex(
      (l) => l.kind === "levelup" && l.by?.["user"] === 아이디,
    );
    const 앞처치 = 처치줄(
      오른곳 < 0 ? [] : 줄들.slice(0, 오른곳),
      아이디,
      "Imp",
    );
    await verify.log(
      "BRP-REQ-115 레벨 업 줄은 임프 처치 경험치 12 가 쌓여 다음 레벨 필요량 버림(100 × 1^1.5) = 100 을 넘는 올림(100 ÷ 12) = 9 번째 처치 바로 뒤에 찍힌다(그 앞 처치 줄 수)",
      오른곳 < 0 ? [] : [앞처치.length],
      Math.ceil(100 / 12),
    );
    await verify(
      "BRP-REQ-116 레벨 업 뒤 /gm stat 레벨은 2 · 경험치는 12 × 9 − 100 = 8 이다",
      뒤 === undefined
        ? 못닿음
        : { 레벨: 스탯숫자(뒤, "레벨"), 경험치: 스탯숫자(뒤, "경험치") },
      { 레벨: 2, 경험치: 12 * Math.ceil(100 / 12) - 100 },
    );
    await verify(
      "BRP-REQ-365 레벨 2 의 /gm stat 다음레벨은 282 다",
      뒤 === undefined ? 못닿음 : 스탯숫자(뒤, "다음레벨"),
      282,
    );
    await verify(
      "BRP-REQ-118 레벨이 오르는 순간 「레벨 업! Lv.2」 알림이 뜬다",
      오른곳 < 0 ? 못닿음 : (알림?.includes("레벨 업! Lv.2") ?? false),
      true,
    );
    await verify(
      "BRP-REQ-119 레벨이 오르는 순간 화면 가운데 큰 글씨 「레벨 업!」이 뜬다",
      오른곳 < 0 ? 못닿음 : 큰글,
      true,
    );
    await verify(
      "BRP-REQ-369 레벨 2 의 /gm stat 공격배율은 1 + 0.03 × (2 − 1) = 1.03 이다",
      뒤 === undefined ? 못닿음 : 스탯숫자(뒤, "공격배율"),
      1.03,
    );
    await verify(
      "BRP-REQ-370 레벨 2 의 /gm stat 방어율은 0.01 × (2 − 1) = 0.01 이다",
      뒤 === undefined ? 못닿음 : 스탯숫자(뒤, "방어율"),
      0.01,
    );
    for (const 줄 of 설명안되는줄(줄들, 알려진줄(1)))
      await verify.note("설명 안 되는 줄", 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
