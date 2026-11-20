import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 자리고르기 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-084',
  name: '휴대폰에서 던전에 들어가면 조작 안내 창의 마우스 그림이 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
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
    await 봇모두끄기(admin);
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 로비화면.열기(game).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('첫 자리를 고르고 「준비!」를 누른다', async () => {
    await 자리고르기(game, 0);
    await new 로비화면(game).준비누르기();
    const 뜸 = await game.waitFor(던전화면.조작안내확인, { timeoutMs: 90_000 }).then(() => true, () => false);
    await verify('조작 안내 창이 뜬다', 뜸, true, { blocker: true });
    const 던전 = new 던전화면(game);
    const 첫째 = await verify('조작 그림 1 이 보이지 않는다', await 던전.조작그림보임(1), false);
    const 둘째 = await verify('조작 그림 2 가 보이지 않는다', await 던전.조작그림보임(2), false);
    const 셋째 = await verify('조작 그림 3 이 보이지 않는다', await 던전.조작그림보임(3), false);
    await verify('휴대폰에서 던전에 들어가면 조작 안내 창의 마우스 그림이 보이지 않는다', 첫째 && 둘째 && 셋째, true);
  });
});
