import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원로그인, 임시회원지우기, type 임시회원, 아이디사용중인가 } from './components/account.component.js';
import { 있어야한다 } from './components/site-extra.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-501',
  name: '회원의 설정 변경 요청은 403 으로 응답한다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원 계정이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  let 회원 = undefined as 임시회원 | undefined;

  try {
    await test.step('새로 만든 회원을 가입시키고 로그인한다', async () => {
      회원 = await 임시회원로그인(request);
    });

    await test.step('새로 만든 회원 계정이 있는지 확인한다', async () => {
      await verify('새로 만든 회원 계정이 있다', await 아이디사용중인가(request, 있어야한다(회원, '새로 만든 회원').loginId), true, { blocker: true });
    });

    await test.step('그 회원으로 설정 변경 PUT /api/admin/settings 를 보낸다', async () => {
      const 응답 = await request.put('/api/admin/settings', { data: { noticePopup: true } });
      await verify('회원의 설정 변경 요청은 403 으로 응답한다', 응답.status(), 403);
    });
  } finally {
    if (회원) await 임시회원지우기(request, 회원);
  }
});
