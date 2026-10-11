import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/account.helper.js';
import { 새가입값 } from './helpers/member.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-030',
  name: '휴대폰을 9자로 적으면 다른 칸을 다 채워도 「가입하기」 가 눌리지 않는다',
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
  const 값 = 새가입값();

  await 방해막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('회원가입 화면에 「가입하기」 버튼이 보인다', await 가입.가입하기버튼.isVisible(), true, { blocker: true });
  });

  await test.step('휴대폰을 9자로 적고 나머지 칸과 약관을 채운다', async () => {
    await 가입.모두채우기(값);
    await verify('다른 칸과 약관을 모두 채우면 「가입하기」 가 눌린다', await 가입.가입하기버튼.isEnabled(), true, { blocker: true });
    await 가입.휴대폰칸.fill('010123456');
    await verify('휴대폰을 9자로 적으면 다른 칸을 다 채워도 「가입하기」 가 눌리지 않는다', await 가입.가입하기버튼.isDisabled(), true);
  });

  await test.step('휴대폰 칸에 10자를 적는다', async () => {
    await 가입.휴대폰칸.fill('0101234567');
    await verify('휴대폰을 10자로 적으면 휴대폰 오류 문구가 보이지 않는다', await 가입.안내문구('phone').isVisible(), false);
  });

  await test.step('휴대폰 칸에 11자를 적는다', async () => {
    await 가입.휴대폰칸.fill('01012345678');
    await verify('휴대폰을 11자로 적으면 휴대폰 오류 문구가 보이지 않는다', await 가입.안내문구('phone').isVisible(), false);
  });
});
