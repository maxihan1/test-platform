import { defineCase, test, verify } from '@platform/kit';

import { 링크글들, 버튼글들, 큰제목들, 화면글들 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-309',
  name: '로그인 화면 /Account/Login 을 열면 큰 제목 「Login」, 입력 「Username」 · 「Password」, 버튼 「Login」, 링크 「Home」이 보인다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /Account/Login 을 불러 화면 글을 읽는다', async () => {
    const 화면 = await 화면글(request, '/Account/Login');
    await verify('로그인 화면 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    const 글들 = 화면글들(화면.html);
    const 큰제목 = await verify('큰 제목 「Login」이 보인다', 큰제목들(화면.html).includes('Login'), true);
    const 아이디 = await verify('입력 「Username」이 보인다', 글들.includes('Username'), true);
    const 비밀번호 = await verify('입력 「Password」가 보인다', 글들.includes('Password'), true);
    const 로그인 = await verify('버튼 「Login」이 보인다', 버튼글들(화면.html).includes('Login'), true);
    const 홈 = await verify('링크 「Home」이 보인다', 링크글들(화면.html).includes('Home'), true);
    await verify('로그인 화면 /Account/Login 을 열면 큰 제목 「Login」, 입력 「Username」 · 「Password」, 버튼 「Login」, 링크 「Home」이 보인다', 큰제목 && 아이디 && 비밀번호 && 로그인 && 홈, true);
  });
});
