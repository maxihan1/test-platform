import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-094',
  name: '눈 모양 버튼을 누르면 입력한 비밀번호가 글자로 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('비밀번호 칸에 값을 적고 눈 모양 버튼을 누른다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.비밀번호칸.fill('Ab1!wxyz');
    await 화면.눈버튼.click();
    await verify('눈 모양 버튼을 누르면 입력한 비밀번호가 글자로 보인다', await 화면.비밀번호칸.getAttribute('type'), 'text');
  });

  await test.step('눈 모양 버튼을 다시 누른다', async () => {
    await 화면.눈버튼.click();
    await verify('비밀번호가 다시 가려진다', await 화면.비밀번호칸.getAttribute('type'), 'password');
  });
});
