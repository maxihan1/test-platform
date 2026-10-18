import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-071',
  name: '생년월일 칸이 날짜 선택기로 보인다',
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

  await test.step('회원가입 화면의 생년월일 칸을 확인한다', async () => {
    await verify(
      '생년월일 칸이 날짜 선택기로 보인다',
      { 보임: await 가입.생년월일.isVisible(), 종류: await 가입.생년월일.getAttribute('type') },
      { 보임: true, 종류: 'date' },
    );
  });
});
