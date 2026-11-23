import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 알림글읽기 } from './helpers/items-tools.helper.js';
import { type 로그줄, 미션로그, 임프있게하기, 적치우고레벨맞추기, 처치줄 } from './helpers/mission-log.helper.js';
import { 레벨업줄, 못닿음, 스탯숫자 } from './helpers/quest-flow.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-GS-014',
  name: '레벨 1 탱커가 임프를 실제로 잡아 처치 경험치가 쌓여 레벨 2 가 되면 오르는 때 · 알림 · 오른 뒤 값이 기획서대로다',
  platforms: ['android'],
  precondition: ['탱커 · 레벨 1 · 경험치 0 · 장비 없음 · 혼자 던전 · 던전의 임프는 치움'],
  elements: ['monster:임프', 'level:1', 'level:2', 'state:직업=탱커'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('탱커로 혼자 던전에 들어가 적을 치우고 레벨 1 · 경험치 0 으로 맞춘다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    await 적치우고레벨맞추기(game, 1);
    const 값 = await GM상태(game);
    await verify('/gm stat 레벨이 1 이다', 스탯숫자(값, '레벨'), 1, { blocker: true });
    await verify('/gm stat 경험치가 0 이다', 스탯숫자(값, '경험치'), 0, { blocker: true });
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step('불러낸 임프를 하나씩 공격해 레벨 업 줄이 찍힐 때까지 처치', async () => {
    const 던전 = await 던전화면.열기(game);
    const hud = new 공통HUD(game);
    let 줄들: 로그줄[] = [];
    let 알림 = null as string | null;
    let 큰글 = false;
    let 뒤: Record<string, string> | undefined;
    let 멈춤: unknown;
    try {
      await repeatUntil(
        async () => {
          await 임프있게하기(game);
          await 던전.첫임프치기();
          if (!큰글) 큰글 = await hud.큰알림뜸('레벨 업!', 300);
          if (알림 === null) 알림 = await 알림글읽기(game, '레벨 업', 300);
        },
        {
          progress: async () => 레벨업줄((줄들 = await 로그.lines()), 나.아이디).length,
          goal: 1,
          stallMs: 90_000,
        },
      );
      뒤 = await GM상태(game);
    } catch (e) {
      멈춤 = e;
    }
    const 오른곳 = 줄들.findIndex((l) => 레벨업줄([l], 나.아이디).length > 0);
    const 앞처치 = 처치줄(오른곳 < 0 ? [] : 줄들.slice(0, 오른곳), 나.아이디, 'Imp');
    await verify.log('BRM-REQ-115 레벨 업 줄은 임프 처치 경험치 12 가 쌓여 다음 레벨 필요량 버림(100 × 1^1.5) = 100 을 넘는 올림(100 ÷ 12) = 9 번째 처치 바로 뒤에 찍힌다(그 앞 처치 줄 수)', 오른곳 < 0 ? [] : [앞처치.length], Math.ceil(100 / 12));
    await verify('BRM-REQ-116 레벨 업 뒤 /gm stat 레벨이 2 다', 뒤 === undefined ? 못닿음 : 스탯숫자(뒤, '레벨'), 2);
    await verify('BRM-REQ-116 레벨 업 뒤 /gm stat 경험치는 12 × 9 − 100 = 8 이다', 뒤 === undefined ? 못닿음 : 스탯숫자(뒤, '경험치'), 12 * Math.ceil(100 / 12) - 100);
    await verify('BRM-REQ-365 레벨 2 의 /gm stat 다음레벨은 282 다', 뒤 === undefined ? 못닿음 : 스탯숫자(뒤, '다음레벨'), 282);
    await verify('BRM-REQ-118 레벨이 오르는 순간 「레벨 업! Lv.2」 알림이 뜬다', 오른곳 < 0 ? 못닿음 : (알림?.includes('레벨 업! Lv.2') ?? false), true);
    await verify('BRM-REQ-119 레벨이 오르는 순간 화면 가운데 큰 글씨 「레벨 업!」이 뜬다', 오른곳 < 0 ? 못닿음 : 큰글, true);
    await verify('BRM-REQ-369 레벨 2 의 /gm stat 공격배율은 1 + 0.03 × (2 − 1) = 1.03 이다', 뒤 === undefined ? 못닿음 : 스탯숫자(뒤, '공격배율'), 1.03);
    await verify('BRM-REQ-370 레벨 2 의 /gm stat 방어율은 0.01 × (2 − 1) = 0.01 이다', 뒤 === undefined ? 못닿음 : 스탯숫자(뒤, '방어율'), 0.01);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
