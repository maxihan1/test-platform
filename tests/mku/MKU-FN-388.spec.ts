import { defineCase, test, verify } from '@platform/kit';

import { 바닥글 } from './components/footer.component.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-388',
  name: '홈 바닥글에서 「개인정보처리방침」 링크를 누르면 개인정보처리방침 화면으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 바닥 = new 바닥글(page);
  const 홈 = new 홈화면(page);
  const 화면 = new 개인정보처리방침화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈 바닥글에서 「개인정보처리방침」 링크를 누른다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 바닥.개인정보처리방침.click();
    await 화면.본문.waitFor();
    await verify('홈 바닥글에서 「개인정보처리방침」 링크를 누르면 개인정보처리방침 화면으로 간다', `${new URL(page.url()).pathname} · ${(await 화면.제목.innerText()).trim()}`, '/privacy · 개인정보처리방침');
  });
});
