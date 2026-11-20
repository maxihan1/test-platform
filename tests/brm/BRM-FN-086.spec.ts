import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 조작안내까지 } from './helpers/dungeon-tools.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-086',
  name: '조작 안내 창의 「확인」을 누르면 창이 닫힌다',
  platforms: ['android'],
  precondition: ['일반 회원이 던전에 들어가 조작 안내 창이 떠 있다'],
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
  await test.step('일반 회원이 던전에 들어가 조작 안내 창을 띄운다', async () => {
    await 조작안내까지(game, driver, 나, 0);
    const 던전 = new 던전화면(game);
    await verify('조작 안내 창이 보인다', await 던전.보임(던전화면.조작안내), true, { blocker: true });
  });
  await test.step('조작 안내 창의 「확인」을 누른다', async () => {
    const 던전 = new 던전화면(game);
    await 던전.조작안내확인누르기();
    await verify('조작 안내 창의 「확인」을 누르면 창이 닫힌다', await 던전.조작안내닫힐때까지(10_000), true);
  });
});
