import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기 } from './helpers/signup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-076',
  name: '가입 화면 동의 체크에 「개인정보처리방침을 읽었고 동의합니다」가 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 가입화면(page);

  await test.step('가입 화면을 연다', async () => {
    await 한국어로(page);
    await 가입화면열기(page);
    await verify('가입 화면 동의 체크에 「개인정보처리방침을 읽었고 동의합니다」가 보인다', await 가입.동의칸.isVisible(), true);
  });

  await test.step('동의 체크의 「개인정보처리방침」 링크를 누른다', async () => {
    await verify('「개인정보처리방침」 링크는 새 창으로 열린다', await 가입.방침링크눌러열린창주소(), '/privacy-policy');
  });
});
