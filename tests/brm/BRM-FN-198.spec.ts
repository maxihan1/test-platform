import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 체력맞추기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-198',
  name: '체력 물약을 쓰면 「체력 물약 사용」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['item:체력 물약'],
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
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「/gm hp 100」 뒤 「물약」 버튼을 누른다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 체력맞추기(game, 100);
    await 던전.hud.물약누르기();
    await verify('체력 물약을 쓰면 「체력 물약 사용」 알림이 뜬다', await 던전.hud.알림뜸('체력 물약 사용'), true);
  });
});
