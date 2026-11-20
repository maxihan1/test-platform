import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상점줄구매, 토스트글들, 토스트뜰때까지, 토스트모두사라질때까지, 토스트자리 } from './helpers/login-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-443',
  name: '체력 물약을 하나 사면 알림은 화면 위쪽 가운데에 한 줄로 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['shop:체력 물약', 'flow:골드-상점 구매'],
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
  await test.step('체력 물약을 하나 산다', async () => {
    await 토스트모두사라질때까지(game);
    const 상점 = await 상점창.열기(game);
    await 상점줄구매(game, 상점, '체력 물약');
    const 떴다 = await 토스트뜰때까지(game);
    await verify('알림이 뜬다', 떴다, true, { blocker: true });
    const 자리 = await 토스트자리(game);
    const 글 = (await 토스트글들(game)).at(-1) ?? '';
    const 위쪽 = await verify('알림이 화면 위쪽에 있다', 자리?.세로 === '위', true);
    const 가운데 = await verify('알림이 화면 가운데에 있다', 자리?.가운데가로 === true, true);
    const 한줄 = await verify('알림 글이 한 줄이다', 글.includes('\n'), false);
    await verify('체력 물약을 하나 사면 알림은 화면 위쪽 가운데에 한 줄로 뜬다', 위쪽 && 가운데 && 한줄, true);
  });
});
