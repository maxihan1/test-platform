import { defineCase, test, verify } from '@platform/kit';

import { 가입완료화면 } from './pages/signup-done.page.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-020',
  name: '필수 약관 둘에 동의해야 「가입하기」 버튼이 눌리고 가입하면 가입 완료 화면이 보인다',
  precondition: ['필수 항목을 모두 채우고 아이디 중복 확인을 마쳤다', '새 아이디로 가입 정보를 모두 채웠다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 완료 = new 가입완료화면(page);
  const 아이디 = `mk${Date.now().toString(36)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}1`;
  const 이름 = '임시회원';

  try {
    await test.step('필수 항목을 모두 채우고 아이디 중복 확인을 마친다', async () => {
      await 화면.열기();
      await 화면.가입하기버튼().waitFor();
      await 화면.필수항목채우기(아이디, 비밀번호, 이름, `${아이디}@demo.market`);
      await 화면.중복확인하기();
      await 화면.중복확인버튼().waitFor();
      await verify('아이디 중복 확인을 마치면 「사용 가능한 아이디입니다」가 보인다', await 화면.입력안내('사용 가능한 아이디입니다').isVisible(), true, { blocker: true });
    });

    await test.step('필수 약관 하나만 동의한다', async () => {
      await 화면.약관체크('(필수) 이용약관 동의').check();
      await verify('필수 약관 하나에만 동의하면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼().isEnabled(), false);
    });

    await test.step('필수 약관 둘에 동의한다', async () => {
      await 화면.약관체크('(필수) 개인정보 수집 동의').check();
      await verify('필수 항목이 모두 채워지고 필수 약관 둘에 동의하면 「가입하기」 버튼이 눌린다', await 화면.가입하기버튼().isEnabled(), true, { blocker: true });
    });

    await test.step('「가입하기」를 누른다', async () => {
      await 화면.가입하기버튼().click();
      await 완료.이름환영문구().waitFor();
      await verify('가입하면 가입 완료 화면에 「{이름}님, 가입을 환영합니다」가 보인다', await 완료.환영문구().innerText(), `${이름}님, 가입을 환영합니다`);
      await verify('가입 완료 화면에 「로그인하러 가기」 버튼이 보인다', await 완료.로그인하러가기버튼().isVisible(), true);
    });
  } finally {
    await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호, remember: false } });
    await page.request.delete('/api/me');
  }
});
