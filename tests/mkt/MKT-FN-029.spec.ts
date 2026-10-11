import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/account.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-029',
  name: '이름에 공백만 넣으면 「이름은 2~10자입니다」 가 보인다',
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

  await test.step('이름 칸에 공백만 적는다', async () => {
    await 가입.이름칸.fill('   ');
    await verify('이름에 공백만 넣으면 「이름은 2~10자입니다」 가 보인다', await 가입.안내문구('name').innerText(), '이름은 2~10자입니다');
  });

  await test.step('이메일 칸에 「a@b」 를 적는다', async () => {
    await 가입.이메일칸.fill('a@b');
    await verify('이메일을 「a@b」 로 적으면 「이메일 형식이 올바르지 않습니다」 가 보인다', await 가입.안내문구('email').innerText(), '이메일 형식이 올바르지 않습니다');
  });

  await test.step('휴대폰 칸에 숫자 5자를 적는다', async () => {
    await 가입.휴대폰칸.fill('12345');
    await verify('휴대폰을 숫자 5자로 적으면 「휴대폰 번호는 숫자 10~11자입니다」 가 보인다', await 가입.안내문구('phone').innerText(), '휴대폰 번호는 숫자 10~11자입니다');
  });
});
