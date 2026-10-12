import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 이용약관화면 } from './pages/terms.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-433',
  name: '이용약관 화면에 제목 「이용약관」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 이용약관화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('이용약관 화면을 연다', async () => {
    await 방해막기(page);
    await 화면.열기();
    await 화면.본문.waitFor();
    await verify('이용약관 화면에 제목 「이용약관」이 보인다', (await 화면.제목.innerText()).trim(), '이용약관');
  });
});
