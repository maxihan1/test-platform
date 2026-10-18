import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-066',
  name: '눈 모양 버튼을 누르면 비밀번호가 글자로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 방해창막기(page);
    await 가입.열기();
    await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
  });

  await test.step('비밀번호를 적고 눈 모양 버튼을 누른다', async () => {
    await 가입.입력하기('password', 'Demo123!');
    await 가입.눈모양누르기();
    await verify('눈 모양 버튼을 누르면 비밀번호가 글자로 보인다', await 가입.비밀번호칸종류(), 'text');
  });

  await test.step('눈 모양 버튼을 한 번 더 누른다', async () => {
    await 가입.눈모양누르기();
    await verify('눈 모양 버튼을 다시 누르면 비밀번호가 가려진다', await 가입.비밀번호칸종류(), 'password');
  });
});
