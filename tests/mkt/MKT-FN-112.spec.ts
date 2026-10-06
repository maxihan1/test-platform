import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원정보 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-112',
  name: '필수 칸을 다 채우고 필수 약관 둘에 동의하면 「가입하기」 버튼이 눌린다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 회원 = 임시회원정보();

  await test.step('중복 확인을 마치고 필수 칸을 다 채운 뒤 필수 약관 둘을 켠다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.필수칸채우기(회원);
    await 화면.중복확인하기();
    await 화면.필수약관켜기();
    await verify('필수 칸을 다 채우고 필수 약관 둘에 동의하면 「가입하기」 버튼이 눌린다', await 화면.가입하기버튼.isEnabled(), true);
  });
});
