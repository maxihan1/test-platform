import { defineCase, test, verify } from '@platform/kit';

import { 링크글들, 일회용회원로그인, 화면글들 } from './helpers/html.helper.js';
import { 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-328',
  name: '비밀번호 바꾸기 화면을 열면 「Security Settings」 · 「Update Password」 · 「Current Password」 · 「New Password」 · 「Confirm New Password」 · 「Cancel」이 보인다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('일회용 회원으로 웹 로그인한 뒤 GET /Account/ChangePassword 를 부른다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 화면 = await 화면글(request, '/Account/ChangePassword');
    await verify('비밀번호 바꾸기 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    const 글들 = 화면글들(화면.html);
    const 제목 = await verify('큰 제목 「Security Settings」가 보인다', 글들.includes('Security Settings'), true);
    const 소제목 = await verify('소제목 「Update Password」가 보인다', 글들.includes('Update Password'), true);
    const 현재 = await verify('입력 「Current Password」가 보인다', 글들.includes('Current Password'), true);
    const 신규 = await verify('입력 「New Password」가 보인다', 글들.includes('New Password'), true);
    const 확인 = await verify('입력 「Confirm New Password」가 보인다', 글들.includes('Confirm New Password'), true);
    const 취소 = await verify('버튼 「Cancel」이 보인다', 링크글들(화면.html).includes('Cancel'), true);
    await verify(
      '비밀번호 바꾸기 화면을 열면 「Security Settings」 · 「Update Password」 · 「Current Password」 · 「New Password」 · 「Confirm New Password」 · 「Cancel」이 보인다',
      제목 && 소제목 && 현재 && 신규 && 확인 && 취소,
      true,
    );
  });
});
