import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';
import { 경로, 보이는이름들 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-126',
  name: '개인정보처리방침 화면에 제목 「개인정보처리방침」과 「제1조 (수집하는 개인정보 항목)」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 방침 = new 개인정보처리방침화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('개인정보처리방침 화면을 연다', async () => {
    await 방해막기(page);
    await 방침.열기();
    await 방침.제목.waitFor();
    await verify('개인정보처리방침 화면이 열려 있다', 경로(page), 개인정보처리방침화면.주소, { blocker: true });
    await verify(
      '개인정보처리방침 화면에 제목 「개인정보처리방침」과 「제1조 (수집하는 개인정보 항목)」이 보인다',
      await 보이는이름들({ '제목 「개인정보처리방침」': 방침.제목, '「제1조 (수집하는 개인정보 항목)」': 방침.제1조 }),
      '제목 「개인정보처리방침」, 「제1조 (수집하는 개인정보 항목)」',
    );
  });
});
