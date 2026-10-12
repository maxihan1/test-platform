import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-389',
  name: '비회원이 개인정보처리방침 주소를 열면 로그인 화면으로 가지 않고 개인정보처리방침 제목이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 개인정보처리방침화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('개인정보처리방침 주소(/privacy)를 연다', async () => {
    await 방해막기(page);
    await 화면.열기();
    await 화면.제목.waitFor();
    await verify('비회원이 개인정보처리방침 주소를 열면 로그인 화면으로 가지 않고 개인정보처리방침 제목이 보인다', `${new URL(page.url()).pathname} · ${(await 화면.제목.innerText()).trim()}`, '/privacy · 개인정보처리방침');
  });
});
