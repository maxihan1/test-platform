import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나, 사라졌나 } from './helpers/visual.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-445',
  name: '모달이 닫히면 모달을 연 「보기」 버튼에 초점이 돌아간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 창 = 가입.약관창('이용약관');
  const 보기 = 가입.약관보기버튼('이용약관');

  await test.step('회원가입 화면을 연다', async () => {
    await 방해창막기(page);
    await 가입.열기();
    await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
  });

  await test.step('약관 「보기」를 눌러 모달을 열고 ESC 로 닫는다', async () => {
    await 보기.focus();
    await 보기.click();
    await verify('약관 모달이 떠 있다', await 나타났나(창), true, { blocker: true });
    await page.keyboard.press('Escape');
    await verify('약관 모달이 닫힌다', await 사라졌나(창), true, { blocker: true });
    await verify('모달이 닫히면 모달을 연 「보기」 버튼에 초점이 돌아간다', await 보기.evaluate((요소) => 요소 === document.activeElement), true);
  });
});
