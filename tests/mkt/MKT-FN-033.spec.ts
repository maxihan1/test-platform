import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/account.helper.js';
import { 새가입값 } from './helpers/member.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-033',
  name: '필수 약관 하나를 끄면 필수 항목을 다 채워도 「가입하기」 가 눌리지 않는다',
  platforms: ['desktop'],
  precondition: [
    '회원가입 화면을 열었다',
  ],
  techniques: ['결정 테이블'],
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

  await test.step('필수 항목을 다 채우고 「(필수) 개인정보 수집 동의」 만 끈다', async () => {
    await 가입.모두채우기(값);
    await verify('다른 칸과 약관을 모두 채우면 「가입하기」 가 눌린다', await 가입.가입하기버튼.isEnabled(), true, { blocker: true });
    await 가입.약관체크('(필수) 개인정보 수집 동의').uncheck();
    await verify('필수 약관 하나를 끄면 필수 항목을 다 채워도 「가입하기」 가 눌리지 않는다', await 가입.가입하기버튼.isDisabled(), true);
  });

  await test.step('필수 항목을 다 채우고 필수 약관 둘에 동의한다', async () => {
    await 가입.필수약관동의();
    await verify('필수 항목을 다 채우고 필수 약관 둘에 동의하면 「가입하기」 가 눌린다', await 가입.가입하기버튼.isEnabled(), true);
  });
});
