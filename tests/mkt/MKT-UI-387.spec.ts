import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-387',
  name: '로그인 화면에서 「회원가입」을 누르면 회원가입 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['로그인 화면이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 방해창막기(page);
    await 로그인.열기();
    await verify('로그인 화면 제목 「로그인」이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 「회원가입」을 누른다', async () => {
    await 로그인.회원가입링크.click();
    await 로그인.회원가입화면가입버튼.waitFor();
    await verify('로그인 화면에서 「회원가입」을 누르면 회원가입 화면이 보인다', await 로그인.회원가입화면제목.isVisible(), true);
    await 로그인.열기();
  });

  await test.step('로그인 화면에서 「비밀번호 찾기」를 누른다', async () => {
    await 로그인.비밀번호찾기링크.click();
    await 로그인.비밀번호찾기화면받기버튼.waitFor();
    await verify('로그인 화면에서 「비밀번호 찾기」를 누르면 비밀번호 찾기 화면이 보인다', await 로그인.비밀번호찾기화면제목.isVisible(), true);
    await 로그인.열기();
  });

  await test.step('로그인 화면에서 「로그인 상태 유지」를 누른다', async () => {
    await 로그인.상태유지.click();
    await verify('로그인 화면에서 「로그인 상태 유지」를 누르면 체크박스가 켜진다', await 로그인.상태유지.isChecked(), true);
  });

  await test.step('로그인 화면에서 「로그인」을 누른다', async () => {
    await verify('로그인 화면에서 「로그인」을 누르면 빈 칸이라 버튼이 눌리지 않는다', await 로그인.로그인버튼.isDisabled(), true);
  });
});
