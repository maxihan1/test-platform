import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-440',
  name: '상점 창을 연 채 체력 물약을 사면 골드가 바뀌어 열린 상점 창의 「보유 골드 500」이 바로 다시 그려진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['shop:체력 물약'],
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
  await test.step('일반 회원으로 로비에 들어가 골드를 530 으로 맞춘다', async () => {
    await 로비로(game, driver, 나);
    await 골드맞추기(game, 530);
    const 상점 = await 상점창.열기(game);
    await verify('상점 창 보유 골드가 530 이다', await 상점.보유골드글(), '보유 골드 530', { blocker: true });
  });
  await test.step('골드를 530 으로 맞추고 상점 창을 연 채 체력 물약을 산다', async () => {
    const 상점 = await 상점창.열기(game);
    const 줄 = await 상점.줄찾기('체력 물약');
    await verify('상점에 체력 물약 줄이 있다', 줄 !== null, true, { blocker: true });
    await 상점.구매누르기(줄 ?? 0);
    await 상점.보유골드가될때까지('500');
    await verify('상점 창을 연 채 체력 물약을 사면 골드가 바뀌어 열린 상점 창의 「보유 골드 500」이 바로 다시 그려진다', await 상점.보유골드글(), '보유 골드 500');
  });
});
