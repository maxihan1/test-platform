import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전이름표글들 } from './helpers/login-tools.helper.js';
import { 지금화면, 던전으로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 불러내기, 적모두처치 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-010',
  name: '임프를 불러내면 그 임프의 이름표가 화면에 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['spawn:임프', 'monster:임프'],
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
  await test.step('임프를 하나 불러 머리 위를 확인한다', async () => {
    await 적모두처치(game);
    await 불러내기(game, 'imp');
    const 나타남 = await game.waitFor(던전화면.임프, { timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
    await verify('불러낸 임프가 화면에 있다', 나타남, true, { blocker: true });
    const 남의이름표 = (await 던전이름표글들(game)).filter((글) => 글 !== 나.아이디);
    await verify('임프를 불러내면 그 임프의 이름표가 화면에 보이지 않는다', 남의이름표.length, 0);
  });
});
