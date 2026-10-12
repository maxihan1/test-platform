import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 약관화면 } from './pages/terms.page.js';
import { 경로, 보이는이름들 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-125',
  name: '이용약관 화면에 제목 「이용약관」과 「제1조 (목적)」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 약관 = new 약관화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('이용약관 화면을 연다', async () => {
    await 방해막기(page);
    await 약관.열기();
    await 약관.제목.waitFor();
    await verify('이용약관 화면이 열려 있다', 경로(page), 약관화면.주소, { blocker: true });
    await verify(
      '이용약관 화면에 제목 「이용약관」과 「제1조 (목적)」이 보인다',
      await 보이는이름들({ '제목 「이용약관」': 약관.제목, '「제1조 (목적)」': 약관.제1조 }),
      '제목 「이용약관」, 「제1조 (목적)」',
    );
  });
});
