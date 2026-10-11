import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 약관화면 } from './pages/terms.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-436',
  name: '비회원이 연 이용약관 화면에 본문 「제1조 (목적)」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 약관 = new 약관화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('이용약관 화면 주소를 연다', async () => {
    await 방해막기(page);
    await 약관.열기();
    await 약관.제목.waitFor();
    await verify('비회원이 연 이용약관 화면에 본문 「제1조 (목적)」이 보인다', await 약관.본문.getByText('제1조 (목적)').isVisible(), true);
  });
});
