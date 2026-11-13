import { defineCase, test, verify } from '@platform/kit';

import { 버튼글들, 링크글들, 큰제목들, 화면글들 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-293',
  name: '계정 만들기 화면을 열면 큰 제목 「Create Account」, 입력 「UserName」 · 「Email」 · 「Password」 · 「Repeat Password」, 버튼 「Create」 · 「Back to Login」이 보인다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /Account/Create 를 불러 화면 글을 읽는다', async () => {
    const 화면 = await 화면글(request, '/Account/Create');
    await verify('계정 만들기 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    const 글들 = 화면글들(화면.html);
    const 큰제목 = await verify('큰 제목 「Create Account」가 보인다', 큰제목들(화면.html).includes('Create Account'), true);
    const 아이디 = await verify('입력 「UserName」이 보인다', 글들.includes('UserName'), true);
    const 이메일 = await verify('입력 「Email」이 보인다', 글들.includes('Email'), true);
    const 비밀번호 = await verify('입력 「Password」가 보인다', 글들.includes('Password'), true);
    const 확인 = await verify('입력 「Repeat Password」가 보인다', 글들.includes('Repeat Password'), true);
    const 만들기 = await verify('버튼 「Create」가 보인다', 버튼글들(화면.html).includes('Create'), true);
    const 돌아가기 = await verify('버튼 「Back to Login」이 보인다', 링크글들(화면.html).includes('Back to Login'), true);
    await verify(
      '계정 만들기 화면을 열면 큰 제목 「Create Account」, 입력 「UserName」 · 「Email」 · 「Password」 · 「Repeat Password」, 버튼 「Create」 · 「Back to Login」이 보인다',
      큰제목 && 아이디 && 이메일 && 비밀번호 && 확인 && 만들기 && 돌아가기,
      true,
    );
  });
});
