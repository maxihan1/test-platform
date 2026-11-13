import { defineCase, test, verify } from '@platform/kit';

import { 머리글링크들 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-288',
  name: '홈을 열면 상단 메뉴에 「AccountService」 · 「Home」 · 「Account」 · 「Downloads」 링크가 보인다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('홈 GET / 을 불러 상단 메뉴를 읽는다', async () => {
    const 화면 = await 화면글(request, '/');
    await verify('홈 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    const 링크들 = 머리글링크들(화면.html);
    const 브랜드 = await verify('「AccountService」 링크가 보인다', 링크들.includes('AccountService'), true);
    const 홈 = await verify('「Home」 링크가 보인다', 링크들.includes('Home'), true);
    const 계정 = await verify('「Account」 링크가 보인다', 링크들.includes('Account'), true);
    const 내려받기 = await verify('「Downloads」 링크가 보인다', 링크들.includes('Downloads'), true);
    await verify('홈을 열면 상단 메뉴에 「AccountService」 · 「Home」 · 「Account」 · 「Downloads」 링크가 보인다', 브랜드 && 홈 && 계정 && 내려받기, true);
  });
});
