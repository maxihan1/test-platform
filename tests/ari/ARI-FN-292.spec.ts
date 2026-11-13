import { defineCase, test, verify } from '@platform/kit';

import { 위조방지토큰, 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-292',
  name: '홈을 열면 로그인 폼에 위조 방지 토큰이 들어 있다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('홈 GET / 을 불러 로그인 폼을 읽는다', async () => {
    const 화면 = await 화면글(request, '/');
    await verify('홈 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    await verify('홈을 열면 로그인 폼에 위조 방지 토큰이 들어 있다', 위조방지토큰(화면.html) !== '', true);
  });
});
