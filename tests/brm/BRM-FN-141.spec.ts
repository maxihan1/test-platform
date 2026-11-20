import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 레벨값 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 경험치주기, 계정꺼내기, 계정되돌리기, 레벨맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-141',
  name: '레벨 1 에서 경험치 1,000 을 받으면 한 번에 「Lv. 4」가 되고 경험치 글이 「99/800」이다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['level:1', 'level:4'],
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('「/gm exp 1000」을 보낸다', async () => {
    const 로비 = await 로비화면.열기(game);
    await 레벨맞추기(game, 1);
    await 경험치주기(game, 1000);
    const 레벨 = await verify('「Lv. 4」가 보인다', 레벨값(await 로비.hud.레벨글()), 4);
    const 경험치 = await verify('경험치 글이 「99/800」이다', await 로비.hud.경험치(), '99/800');
    await verify('레벨 1 에서 경험치 1,000 을 받으면 한 번에 「Lv. 4」가 되고 경험치 글이 「99/800」이다', 레벨 && 경험치, true);
  });
});
