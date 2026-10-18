import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-078',
  name: '약관 「보기」를 누르면 약관 전문 모달이 뜬다',
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

  await test.step('「(필수) 이용약관 동의」 옆 「보기」를 누른다', async () => {
    await 가입.약관보기버튼('이용약관').click();
    await verify('약관 「보기」를 누르면 약관 전문 모달이 뜬다', await 나타났나(가입.약관창('이용약관')), true);
  });
});
