import { defineCase, test, verify } from '@platform/kit';

import { 바닥글 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-289',
  name: '홈을 열면 하단에 「© 2023 - AccountService - Privacy」가 보인다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('홈 GET / 을 불러 하단을 읽는다', async () => {
    const 화면 = await 화면글(request, '/');
    await verify('홈 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    await verify('홈을 열면 하단에 「© 2023 - AccountService - Privacy」가 보인다', 바닥글(화면.html), '© 2023 - AccountService - Privacy');
  });
});
