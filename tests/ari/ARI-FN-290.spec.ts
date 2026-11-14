import { defineCase, test, verify } from '@platform/kit';

import { 머리글링크들, 제목글, 큰제목들 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-290',
  name: '홈을 열면 브랜드 「AccountService」 · 탭 「Account Manager」 · 큰 제목 「AnyMMO Account」가 보인다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('홈 GET / 을 불러 브랜드 · 탭 제목 · 큰 제목을 읽는다', async () => {
    const 화면 = await 화면글(request, '/');
    await verify('홈 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    const 브랜드 = await verify('브랜드 「AccountService」가 보인다', 머리글링크들(화면.html).includes('AccountService'), true);
    const 탭 = await verify('탭 제목에 「Account Manager」가 들어 있다', 제목글(화면.html).includes('Account Manager'), true);
    const 큰제목 = await verify('큰 제목 「AnyMMO Account」가 보인다', 큰제목들(화면.html).includes('AnyMMO Account'), true);
    await verify('홈을 열면 브랜드 「AccountService」 · 탭 「Account Manager」 · 큰 제목 「AnyMMO Account」가 보인다', 브랜드 && 탭 && 큰제목, true);
  });
});
