import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 경험치주기, 계정꺼내기, 계정되돌리기, 레벨맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-140',
  name: '레벨 1 에서 경험치 100 을 받으면 레벨이 2 로 오르고 경험치 글이 「0/282」다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['level:1', 'level:2'],
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
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await 레벨맞추기(game, 1);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('「/gm exp 100」을 보낸다', async () => {
    await 경험치주기(game, 100);
    const 레벨 = await verify('레벨이 2 로 오른다', (await hud.레벨글()).startsWith('Lv.2 '), true);
    const 경험치 = await verify('경험치 글이 「0/282」다', await hud.경험치(), '0/282');
    await verify('레벨 1 에서 경험치 100 을 받으면 레벨이 2 로 오르고 경험치 글이 「0/282」다', 레벨 && 경험치, true);
  });
  await test.step('「/gm exp 99」를 보낸다', async () => {
    await 레벨맞추기(game, 1);
    await 경험치주기(game, 99);
    const 레벨 = await verify('「Lv.1」 그대로다', (await hud.레벨글()).startsWith('Lv.1 '), true);
    const 경험치 = await verify('경험치 글이 「99/100」이다', await hud.경험치(), '99/100');
    await verify('레벨이 오르지 않고 경험치 글이 「99/100」이다', 레벨 && 경험치, true);
  });
});
