import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-066',
  name: '약관 모달은 「확인」을 누르면 닫힌다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 약관창 = 가입.약관창('이용약관');
  await 안내창막기(page);

  await test.step('회원가입 화면에서 약관 모달을 연다', async () => {
    await 가입.열기();
    await 가입.약관보기('이용약관').click();
    await 약관창.뜰때까지();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('약관 모달이 보인다', await 약관창.창.isVisible(), true, { blocker: true });
  });

  await test.step('약관 모달의 「확인」을 누른다', async () => {
    await 약관창.버튼('확인').click();
    await 약관창.사라질때까지();
    await verify('약관 모달은 「확인」을 누르면 닫힌다', await 약관창.창.isVisible(), false);
  });

  await test.step('약관 모달 오른쪽 위 X 를 누른다', async () => {
    await 가입.약관보기('이용약관').click();
    await 약관창.뜰때까지();
    await 약관창.닫기X.click();
    await 약관창.사라질때까지();
    await verify('약관 모달은 오른쪽 위 X 를 누르면 닫힌다', await 약관창.창.isVisible(), false);
  });

  await test.step('약관 모달 바깥을 누른다', async () => {
    await 가입.약관보기('이용약관').click();
    await 약관창.뜰때까지();
    await 약관창.바깥누르기();
    await 약관창.사라질때까지();
    await verify('약관 모달은 바깥을 누르면 닫힌다', await 약관창.창.isVisible(), false);
  });

  await test.step('약관 모달에서 ESC 를 친다', async () => {
    await 가입.약관보기('이용약관').click();
    await 약관창.뜰때까지();
    await page.keyboard.press('Escape');
    await 약관창.사라질때까지();
    await verify('약관 모달은 ESC 를 치면 닫힌다', await 약관창.창.isVisible(), false);
  });
});
