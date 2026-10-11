import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/account.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-153',
  name: '비밀번호 확인 칸에 21자를 적으면 20자까지만 들어간다',
  platforms: ['desktop'],
  precondition: [
    '회원가입 화면을 열었다',
  ],
  techniques: ['경계값 분석'],
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

  await test.step('비밀번호 확인 칸에 21자를 적는다', async () => {
    await 가입.비밀번호확인칸.fill('abcdefghij1234567890!');
    await verify('비밀번호 확인 칸에 21자를 적으면 20자까지만 들어간다', (await 가입.비밀번호확인칸.inputValue()).length, 20);
  });

  await test.step('비밀번호 확인 칸에 20자를 적는다', async () => {
    await 가입.비밀번호확인칸.fill('abcdefghij123456789!');
    await verify('비밀번호 확인 칸에 20자를 적으면 20자가 모두 들어간다', await 가입.비밀번호확인칸.inputValue(), 'abcdefghij123456789!');
  });
});
