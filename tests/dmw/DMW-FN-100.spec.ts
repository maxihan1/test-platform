import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-100',
  name: '아이디와 이메일이 맞으면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  const 회원 = await 일회용회원만들기(request);
  await 안내창막기(page);

  await test.step('비밀번호 찾기 화면을 연다', async () => {
    await 찾기.열기();
    await verify('비회원이다', await 찾기.머리.로그인.isVisible(), true, { blocker: true });
    await verify('비밀번호 찾기 화면이 보인다', await 찾기.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('일회용 회원의 아이디와 이메일로 「임시 비밀번호 받기」를 누른다', async () => {
    await 찾기.아이디.fill(회원.loginId);
    await 찾기.이메일.fill(회원.email);
    await 찾기.누르기();
    await verify('아이디와 이메일이 맞으면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」가 보인다', await 찾기.보냄안내.isVisible(), true);
  });
});
