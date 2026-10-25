import { defineCase, test, verify } from '@platform/kit';

import { 요청로그인한일회용회원 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-373',
  name: '쿠폰 목록 API 는 보유 쿠폰 두 가지를 돌려준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('일회용 회원으로 로그인한다', async () => {
    await 요청로그인한일회용회원(request);
    await verify('일회용 회원으로 로그인해 있다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user !== null, true, { blocker: true });
  });

  await test.step('GET /api/coupons 를 부른다', async () => {
    const 응답 = await request.get('/api/coupons');
    await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
    const 쿠폰들 = ((await 응답.json()) as { items: { id: string }[] }).items.map((쿠폰) => 쿠폰.id).sort();
    await verify('쿠폰 목록 API 는 보유 쿠폰 두 가지를 돌려준다', 쿠폰들, ['FLAT3000', 'RATE10']);
  });
});
