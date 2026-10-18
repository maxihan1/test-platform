import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-388',
  name: '비밀번호 찾기 화면에서 「로그인으로 돌아가기」를 누르면 로그인 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비밀번호 찾기 화면이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('비밀번호 찾기 화면을 연다', async () => {
    await 방해창막기(page);
    await 찾기.열기();
    await verify('비밀번호 찾기 화면 제목 「비밀번호 찾기」가 보인다', await 찾기.제목.isVisible(), true, { blocker: true });
  });

  await test.step('비밀번호 찾기 화면에서 「로그인으로 돌아가기」를 누른다', async () => {
    await 찾기.돌아가기링크.click();
    await 로그인.그려질때까지();
    await verify('비밀번호 찾기 화면에서 「로그인으로 돌아가기」를 누르면 로그인 화면이 보인다', await 로그인.제목.isVisible(), true);
    await 찾기.열기();
  });

  await test.step('비밀번호 찾기 화면에서 「임시 비밀번호 받기」를 누른다', async () => {
    await verify('비밀번호 찾기 화면에서 「임시 비밀번호 받기」를 누르면 버튼이 보이고 누를 수 있다', (await 찾기.받기버튼.isVisible()) && (await 찾기.받기버튼.isEnabled()), true);
  });
});
