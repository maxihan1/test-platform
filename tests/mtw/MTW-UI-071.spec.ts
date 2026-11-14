import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 로그인전화면 } from './pages/guest-landing.page.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-071',
  name: '규칙이 없는 이 서버에서 「계정 생성」을 누르면 규칙 동의 없이 세부사항 입력 화면이 바로 열린다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 전화면 = new 로그인전화면(page);
  const 가입 = new 가입화면(page);

  await test.step('로그인 전 화면에서 「계정 생성」을 누른다', async () => {
    await 한국어로(page);
    await 전화면.열기();
    await 전화면.계정생성.click();
    await 가입.등록하기.waitFor();
    const 입력화면 = await verify('세부사항 입력 화면 제목이 보인다', await 가입.제목.isVisible(), true);
    const 주소 = await verify('가입 화면 주소로 바로 간다', new URL(page.url()).pathname, 가입화면.주소);
    await verify('규칙이 없는 이 서버에서 「계정 생성」을 누르면 규칙 동의 없이 세부사항 입력 화면이 바로 열린다', 입력화면 && 주소, true);
  });
});
