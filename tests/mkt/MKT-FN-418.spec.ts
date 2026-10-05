import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원정보 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-418',
  name: '쓰지 않은 아이디면 「available」이 true 다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('쓰지 않은 아이디로 check-id 를 부른다', async () => {
    const 응답 = await request.get(`/api/auth/check-id?loginId=${encodeURIComponent(임시회원정보().loginId)}`);
    const 본문 = (await 응답.json()) as { available: boolean };
    await verify('쓰지 않은 아이디면 「available」이 true 다', 본문.available, true);
  });

  await test.step('아이디 「user2」로 check-id 를 부른다', async () => {
    const 응답 = await request.get('/api/auth/check-id?loginId=user2');
    const 본문 = (await 응답.json()) as { available: boolean };
    await verify('있는 아이디면 「available」이 false 다', 본문.available, false);
  });
});
