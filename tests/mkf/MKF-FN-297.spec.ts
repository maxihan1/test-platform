import { defineCase, test, verify } from '@platform/kit';

import { 바닥글 } from './components/footer.component.js';
import { 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-297',
  name: '바닥글 「개인정보처리방침」 링크를 누르면 제목 「개인정보처리방침」이 보이는 개인정보처리방침 화면으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 바닥 = new 바닥글(page);
  const 화면 = new 개인정보처리방침화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈에서 바닥글 「개인정보처리방침」 링크를 누른다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 바닥.개인정보처리방침.click();
    await 화면.본문.waitFor();
    await verify('바닥글 「개인정보처리방침」 링크를 누르면 제목 「개인정보처리방침」이 보이는 개인정보처리방침 화면으로 간다', [경로(page), await 화면.첫제목.innerText()], ['/privacy', '개인정보처리방침']);
  });
});
