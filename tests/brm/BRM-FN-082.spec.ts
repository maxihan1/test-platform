import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-082',
  name: '조작 안내 창을 닫은 뒤 확대 버튼을 찾으면 휴대폰 던전 화면에는 화면 확대 버튼이 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
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
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await 던전화면.열기(game);
    await verify('조작 안내 창이 닫혀 있다', (await game.find(던전화면.조작안내)) === null, true, { blocker: true });
  });
  await test.step('조작 안내 창을 닫은 뒤 확대 버튼을 찾는다', async () => {
    const 던전 = new 던전화면(game);
    await verify('조작 안내 창을 닫은 뒤 확대 버튼을 찾으면 휴대폰 던전 화면에는 화면 확대 버튼이 보이지 않는다', await 던전.확대버튼보임(), false);
  });
});
