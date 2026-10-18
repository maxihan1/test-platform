import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-076',
  name: '「전체 동의」를 켜면 약관 셋이 모두 켜진다',
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

  await test.step('「전체 동의」를 켠다', async () => {
    await 가입.전체동의.check();
    await verify(
      '「전체 동의」를 켜면 약관 셋이 모두 켜진다',
      {
        이용약관: await 가입.이용약관동의.isChecked(),
        개인정보: await 가입.개인정보동의.isChecked(),
        마케팅: await 가입.마케팅동의.isChecked(),
      },
      { 이용약관: true, 개인정보: true, 마케팅: true },
    );
  });
});
