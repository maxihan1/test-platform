import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/account.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-031',
  name: '휴대폰을 9자로 적으면 「휴대폰 번호는 숫자 10~11자입니다」 가 보인다',
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

  await test.step('휴대폰 칸에 9자를 적는다', async () => {
    await 가입.휴대폰칸.fill('010123456');
    await verify('휴대폰을 9자로 적으면 「휴대폰 번호는 숫자 10~11자입니다」 가 보인다', await 가입.안내문구('phone').innerText(), '휴대폰 번호는 숫자 10~11자입니다');
  });

  await test.step('휴대폰 칸에 10자를 적는다', async () => {
    await 가입.휴대폰칸.fill('0101234567');
    await verify('휴대폰을 10자로 적으면 「휴대폰 번호는 숫자 10~11자입니다」 가 보이지 않는다', await 가입.안내문구('phone').isVisible(), false);
  });

  await test.step('휴대폰 칸에 11자를 적는다', async () => {
    await 가입.휴대폰칸.fill('01012345678');
    await verify(
      '휴대폰 칸에 11자를 적으면 11자가 모두 들어가고 휴대폰 오류 문구가 보이지 않는다',
      { 값: await 가입.휴대폰칸.inputValue(), 오류문구보임: await 가입.안내문구('phone').isVisible() },
      { 값: '01012345678', 오류문구보임: false },
    );
  });

  await test.step('휴대폰 칸에 12자를 적는다', async () => {
    await 가입.휴대폰칸.fill('010123456789');
    await verify('휴대폰 칸에 12자를 적으면 11자까지만 들어간다', (await 가입.휴대폰칸.inputValue()).length, 11);
  });
});
