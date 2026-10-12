import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 가입본문, 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-265',
  name: '아이디가 겹치는 회원가입은 409 로 응답한다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('이미 있는 아이디 「admin」으로 POST /api/auth/signup 을 부르고 code 를 확인한다', async () => {
    const res = await request.post('/api/auth/signup', { data: 가입본문({ ...새회원정보(), loginId: 'admin' }) });
    const 코드 = ((await res.json()) as { code?: string }).code;
    await verify('아이디가 겹치는 회원가입은 409 로 응답한다', { 상태: res.status(), 코드 }, { 상태: 409, 코드: 'CONFLICT' });
  });
});
