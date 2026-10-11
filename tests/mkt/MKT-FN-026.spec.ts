import { defineCase, test, verify } from '@platform/kit';

import { 둘째아이디, 방해막기 } from './helpers/account.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-026',
  name: '이미 있는 아이디로 「중복 확인」 을 누르면 「이미 사용 중인 아이디입니다」 가 보인다',
  platforms: ['desktop'],
  precondition: [
    '회원가입 화면을 열었다',
  ],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);

  await 방해막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('회원가입 화면에 「가입하기」 버튼이 보인다', await 가입.가입하기버튼.isVisible(), true, { blocker: true });
  });

  await test.step('아이디에 이미 있는 아이디를 적고 「중복 확인」 을 누른다', async () => {
    await 가입.아이디칸.fill(둘째아이디);
    await 가입.중복확인누르기();
    await verify('이미 있는 아이디로 「중복 확인」 을 누르면 「이미 사용 중인 아이디입니다」 가 보인다', await 가입.안내문구('loginId').innerText(), '이미 사용 중인 아이디입니다');
  });
});
