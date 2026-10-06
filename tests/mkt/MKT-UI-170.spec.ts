import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/common-signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-170',
  name: '회원가입 화면의 입력칸이 모두 이름표와 연결되어 있다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 안내창끄기(page);
    await 가입.열기();
    await verify('비회원이다', await 가입.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('회원가입 화면의 입력칸이 모두 이름표와 연결되어 있다', [(await 가입.입력칸들.count()) > 0, (await 가입.이름표없는칸들()).join(', ')], [true, '']);
  });
});
