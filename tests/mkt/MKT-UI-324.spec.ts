import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 입력칸이름표 } from './helpers/visual.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-324',
  name: '회원가입 화면의 입력칸마다 이름표가 이어져 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 방해창막기(page);
    await 가입.열기();
    await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
    await verify('머리글에 「로그인」 링크가 보인다', await 가입.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('회원가입 화면의 입력칸 이름표를 확인한다', async () => {
    const 결과 = await 입력칸이름표(page);
    await verify('회원가입 화면에 입력칸이 있다', 결과.칸수 > 0, true, { blocker: true });
    await verify('회원가입 화면의 입력칸마다 이름표가 이어져 있다', 결과.이름표없는칸, []);
  });

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열기();
    await verify('로그인 화면 제목 「로그인」이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면의 입력칸 이름표를 확인한다', async () => {
    const 결과 = await 입력칸이름표(page);
    await verify('로그인 화면에 입력칸이 있다', 결과.칸수 > 0, true, { blocker: true });
    await verify('로그인 화면의 입력칸마다 이름표가 이어져 있다', 결과.이름표없는칸, []);
  });
});
