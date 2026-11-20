import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 쓰러뜨리기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 결과화면 } from './pages/postgame.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-570',
  name: '결과 화면에서 「메인 메뉴로」를 누르면 로그인 창이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 결과 화면에 와 있다'],
  elements: ['zone:PostGame'],
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
  await test.step('일반 회원이 결과 화면까지 간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await 쓰러뜨리기(game);
    await 결과화면.열기(game, 60_000);
    await verify('결과 화면이 보인다', await 지금화면(game), '결과', { blocker: true });
  });
  await test.step('「메인 메뉴로」를 누른다', async () => {
    const 결과 = await 결과화면.열기(game, 30_000);
    await 결과.메인메뉴로();
    const 로그인 = await 로그인화면.열기(game).then(
      () => true,
      () => false,
    );
    await verify('결과 화면에서 「메인 메뉴로」를 누르면 로그인 창이 보인다', 로그인, true);
  });
});
