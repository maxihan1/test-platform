import { defineCase, test, verify } from '@platform/kit';

import { 보이는이름들, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-440',
  name: '비회원이 연 개인정보처리방침 화면에 본문 「제1조 (수집하는 개인정보 항목)」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 방침 = new 개인정보처리방침화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('개인정보처리방침 화면 주소를 연다', async () => {
    await 방해막기(page);
    await 방침.열기();
    await 방침.제목.waitFor();
    await 방침.본문.waitFor();
    await verify(
      '비회원이 연 개인정보처리방침 화면에 본문 「제1조 (수집하는 개인정보 항목)」이 보인다',
      await 보이는이름들({ '본문 「제1조 (수집하는 개인정보 항목)」': 방침.제1조 }),
      '본문 「제1조 (수집하는 개인정보 항목)」',
    );
  });
});
