import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상점줄구매, 어두운빨강인가, 연분홍인가, 토스트글자색, 토스트뜰때까지, 토스트모두사라질때까지, 토스트바탕색 } from './helpers/login-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-448',
  name: '오류 알림이 뜨면 바탕이 어두운 빨강이고 글씨가 연분홍이다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  techniques: ['동등 분할'],
  elements: ['shop:강철 롱소드', 'flow:골드-상점 구매'],
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
  await test.step('골드 200 으로 강철 롱소드를 사려 한다', async () => {
    await 토스트모두사라질때까지(game);
    const 상점 = await 상점창.열기(game);
    await 상점줄구매(game, 상점, '강철 롱소드');
    const 떴다 = await 토스트뜰때까지(game);
    await verify('오류 알림이 뜬다', 떴다, true, { blocker: true });
    const 바탕 = await verify('알림 바탕이 어두운 빨강이다', 어두운빨강인가(await 토스트바탕색(game)), true);
    const 글씨 = await verify('알림 글씨가 연분홍이다', 연분홍인가(await 토스트글자색(game)), true);
    await verify('오류 알림이 뜨면 바탕이 어두운 빨강이고 글씨가 연분홍이다', 바탕 && 글씨, true);
  });
});
