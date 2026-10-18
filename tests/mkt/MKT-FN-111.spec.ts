import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-111',
  name: '아이디와 비밀번호가 비어 있으면 「로그인」 버튼이 눌리지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['로그인 화면이 열려 있다'],
  techniques: ['결정 테이블'],
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

  await test.step('아이디와 비밀번호 칸을 비워 둔다', async () => {
    await verify('아이디와 비밀번호가 비어 있으면 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인버튼.isDisabled(), true);
  });

  await test.step('아이디만 적는다', async () => {
    await 로그인.아이디.fill('아이디만입력');
    await verify('비밀번호가 비어 있으면 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인버튼.isDisabled(), true);
  });

  await test.step('아이디를 지우고 비밀번호만 적는다', async () => {
    await 로그인.아이디.fill('');
    await 로그인.비밀번호.fill('비밀번호만입력');
    await verify('아이디가 비어 있으면 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인버튼.isDisabled(), true);
  });
});
