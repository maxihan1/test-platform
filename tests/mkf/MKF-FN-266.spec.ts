import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-266',
  name: '없는 아이디로 확인하면 available 이 true 다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('없는 아이디로 GET /api/auth/check-id 를 부른다', async () => {
    const res = await request.get('/api/auth/check-id', { params: { loginId: 새회원정보().loginId } });
    const 본문 = (await res.json()) as { available?: boolean };
    await verify('없는 아이디로 확인하면 available 이 true 다', 본문.available, true);
  });

  await test.step('「admin」으로 GET /api/auth/check-id 를 부른다', async () => {
    const res = await request.get('/api/auth/check-id', { params: { loginId: 'admin' } });
    const 본문 = (await res.json()) as { available?: boolean };
    await verify('이미 있는 아이디로 확인하면 available 이 false 다', 본문.available, false);
  });
});
