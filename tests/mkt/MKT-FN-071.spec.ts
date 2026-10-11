import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 보이는글, 세션아이디, 가입자정리하기 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';
import { 가입완료화면 } from './pages/signup-done.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-071',
  name: '회원가입을 마치면 가입 완료 화면에 「{이름}님, 가입을 환영합니다」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);
  const 완료 = new 가입완료화면(page);
  const 정보 = 새회원정보();

  try {
    await test.step('비회원인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('회원가입 칸을 다 채우고 「가입하기」를 누른다', async () => {
      await 방해막기(page);
      await 회원가입.열기();
      await 회원가입.제목.waitFor();
      await 회원가입.가입준비하기(정보);
      await 회원가입.가입하기.click();
      await 완료.로그인하러가기.waitFor();
      await verify('회원가입을 마치면 가입 완료 화면에 「{이름}님, 가입을 환영합니다」가 보인다', await 보이는글(완료.환영), `${정보.name}님, 가입을 환영합니다`);
      await verify('가입 완료 화면에 「로그인하러 가기」 버튼이 보인다', await 완료.로그인하러가기.isVisible(), true);
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});
