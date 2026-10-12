import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-084',
  name: '회원가입 생년월일 칸은 날짜 선택 칸으로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('회원가입 화면을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
    await 회원가입.제목.waitFor();
    await verify('회원가입 생년월일 칸은 날짜 선택 칸으로 보인다', await 회원가입.생년월일.getAttribute('type'), 'date');
  });
});
