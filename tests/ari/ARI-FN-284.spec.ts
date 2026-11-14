import { defineCase, test, verify } from '@platform/kit';

import { 화면글들 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-284',
  name: 'GET /Home/Privacy 를 부르면 「Use this page to detail your site’s privacy policy.」가 보인다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /Home/Privacy 를 부른다', async () => {
    const 화면 = await 화면글(request, '/Home/Privacy');
    await verify('GET /Home/Privacy 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    await verify('GET /Home/Privacy 를 부르면 「Use this page to detail your site’s privacy policy.」가 보인다', 화면글들(화면.html).includes('Use this page to detail your site’s privacy policy.'), true);
  });
});
