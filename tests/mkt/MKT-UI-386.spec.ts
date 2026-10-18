import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 가입완료화면 } from './pages/signup.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-386',
  name: '가입 완료 화면에서 「로그인하러 가기」를 누르면 로그인 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 완료 = new 가입완료화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('가입 완료 화면을 연다', async () => {
    await 방해창막기(page);
    await 완료.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 완료.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('가입 완료 화면 제목 「가입을 환영합니다」가 보인다', await 완료.제목.isVisible(), true, { blocker: true });
  });

  await test.step('가입 완료 화면에서 「로그인하러 가기」를 누른다', async () => {
    await 완료.로그인하러가기.click();
    await verify('가입 완료 화면에서 「로그인하러 가기」를 누르면 로그인 화면이 보인다', await 나타났나(로그인.제목), true);
  });
});
