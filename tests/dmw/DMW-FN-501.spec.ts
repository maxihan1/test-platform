import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-501',
  name: '아이디와 이메일을 비우고 「임시 비밀번호 받기」를 누르면 빈 값 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  await 안내창막기(page);

  await test.step('비밀번호 찾기 화면을 연다', async () => {
    await 찾기.열기();
    await verify('비회원이다', await 찾기.머리.로그인.isVisible(), true, { blocker: true });
    await verify('비밀번호 찾기 화면이 보인다', await 찾기.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('아이디와 이메일을 비우고 「임시 비밀번호 받기」를 누른다', async () => {
    await 찾기.누르기();
    await verify('아이디와 이메일을 비우고 「임시 비밀번호 받기」를 누르면 빈 값 안내가 보인다', await 찾기.없음안내.isVisible(), true);
  });
});
