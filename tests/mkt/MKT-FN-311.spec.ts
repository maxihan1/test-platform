import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-311',
  name: '로그인한 채 GET /api/coupons 를 부르면 쿠폰 「10% 할인 (최대 5,000원)」 · 「3,000원 할인 (30,000원 이상 구매 시)」이 돌아온다',
  precondition: ['새로 가입한 회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  try {
    await test.step('새 회원으로 로그인한다', async () => {
      await 새회원으로로그인(request);
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('로그인한 회원이 있다', (await 세션사용자(request)) !== null, true, { blocker: true });
    });

    await test.step('GET /api/coupons 를 부른다', async () => {
      const 응답 = await request.get('/api/coupons');
      await verify('GET /api/coupons 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
      const { items } = (await 응답.json()) as { items: { label: string }[] };
      const 이름들 = items.map((쿠폰) => 쿠폰.label);
      await verify('로그인한 채 GET /api/coupons 를 부르면 쿠폰 「10% 할인 (최대 5,000원)」 · 「3,000원 할인 (30,000원 이상 구매 시)」이 돌아온다', ['10% 할인 (최대 5,000원)', '3,000원 할인 (30,000원 이상 구매 시)'].every((이름) => 이름들.includes(이름)), true);
    });
  } finally {
    await 탈퇴(request);
  }
});
