import { defineCase, test, verify } from '@platform/kit';

import { 제목글 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-287',
  name: '홈을 열면 탭 제목이 「 - Account Manager」로 끝난다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('홈 GET / 을 불러 탭 제목을 읽는다', async () => {
    const 화면 = await 화면글(request, '/');
    await verify('홈 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    await verify('홈을 열면 탭 제목이 「 - Account Manager」로 끝난다', 제목글(화면.html).endsWith(' - Account Manager'), true);
  });
});
