import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디, 보이는이름들 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-087',
  name: '회원가입 화면에 관심 분야 체크박스 「패션」 · 「전자기기」 · 「도서」 · 「식품」이 보인다',
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
    await verify(
      '회원가입 화면에 관심 분야 체크박스 「패션」 · 「전자기기」 · 「도서」 · 「식품」이 보인다',
      await 보이는이름들({ '「패션」': 회원가입.관심패션, '「전자기기」': 회원가입.관심전자기기, '「도서」': 회원가입.관심도서, '「식품」': 회원가입.관심식품 }),
      '「패션」, 「전자기기」, 「도서」, 「식품」',
    );
  });
});
