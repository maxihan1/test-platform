import { defineCase, test, verify } from '@platform/kit';

import { 링크글들, 읽기전용칸인가, 큰제목들, 화면글들, 일회용회원로그인 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-322',
  name: '정보 수정 화면을 열면 「Edit Account Details」 · 읽기 전용 「UserName」 · 「Username cannot be changed.」 · 「Email」 · 「Save Changes」 · 「Cancel」 · 「Logout」이 보인다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('일회용 회원으로 웹 로그인한 뒤 GET /Account/Edit 를 부른다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 화면 = await 화면글(request, '/Account/Edit');
    await verify('정보 수정 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    const 글들 = 화면글들(화면.html);
    const 제목 = await verify('큰 제목 「Edit Account Details」가 보인다', 큰제목들(화면.html).includes('Edit Account Details'), true);
    const 아이디 = await verify('입력 「UserName」이 보인다', 글들.includes('UserName'), true);
    const 읽기전용 = await verify('「UserName」 칸이 읽기 전용이다', 읽기전용칸인가(화면.html, 'UserName'), true);
    const 안내 = await verify('안내 「Username cannot be changed.」가 보인다', 글들.includes('Username cannot be changed.'), true);
    const 이메일 = await verify('입력 「Email」이 보인다', 글들.includes('Email'), true);
    const 저장 = await verify('버튼 「Save Changes」가 보인다', 글들.includes('Save Changes'), true);
    const 취소 = await verify('버튼 「Cancel」이 보인다', 링크글들(화면.html).includes('Cancel'), true);
    const 로그아웃 = await verify('링크 「Logout」이 보인다', 링크글들(화면.html).includes('Logout'), true);
    await verify(
      '정보 수정 화면을 열면 「Edit Account Details」 · 읽기 전용 「UserName」 · 「Username cannot be changed.」 · 「Email」 · 「Save Changes」 · 「Cancel」 · 「Logout」이 보인다',
      제목 && 아이디 && 읽기전용 && 안내 && 이메일 && 저장 && 취소 && 로그아웃,
      true,
    );
  });
});
