import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/account.helper.js';
import { 새가입값 } from './helpers/member.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-028',
  name: '중복 확인을 하지 않으면 다른 칸을 다 채우고 약관에 동의해도 「가입하기」 가 눌리지 않는다',
  platforms: ['desktop'],
  precondition: [
    '회원가입 화면을 열었다',
  ],
  techniques: ['동등 분할', '결정 테이블'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 값 = 새가입값();
  const 고친아이디 = 값.아이디.slice(0, -1) + (값.아이디.endsWith('a') ? 'b' : 'a');

  await 방해막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('회원가입 화면에 「가입하기」 버튼이 보인다', await 가입.가입하기버튼.isVisible(), true, { blocker: true });
  });

  await test.step('중복 확인 없이 다른 칸과 약관을 모두 채운다', async () => {
    await 가입.필수칸채우기(값);
    await 가입.필수약관동의();
    await verify('중복 확인을 하지 않으면 다른 칸을 다 채우고 약관에 동의해도 「가입하기」 가 눌리지 않는다', await 가입.가입하기버튼.isDisabled(), true);
  });

  await test.step('중복 확인을 마친 뒤 아이디를 한 글자 고친다', async () => {
    await 가입.아이디확인하기();
    await verify('중복 확인을 마치면 「가입하기」 가 눌린다', await 가입.가입하기버튼.isEnabled(), true, { blocker: true });
    await 가입.아이디칸.fill(고친아이디);
    await verify('중복 확인 뒤 아이디를 고치면 「가입하기」 가 다시 눌리지 않는다', await 가입.가입하기버튼.isDisabled(), true);
  });
});
