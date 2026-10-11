import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디, 응답붙잡기 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-015',
  name: '응답을 늦춘 채 「임시 비밀번호 받기」를 누르면 응답 전까지 버튼이 눌리지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  let 붙잡음: { 풀기: () => Promise<void> } | undefined;

  try {
    await test.step('비회원인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('비밀번호 찾기 응답을 늦춘 채 「임시 비밀번호 받기」를 누른다', async () => {
      붙잡음 = await 응답붙잡기(page, '**/api/auth/find-password');
      await 방해막기(page);
      await 찾기.열기();
      await 찾기.받기.click();
      await verify('응답을 늦춘 채 「임시 비밀번호 받기」를 누르면 응답 전까지 버튼이 눌리지 않는다', await 찾기.받기.isEnabled(), false);
      await verify(
        '응답을 늦춘 채 「임시 비밀번호 받기」를 누르면 응답 전까지 버튼 글자 대신 로딩 표시가 보인다',
        { 로딩표시: await 찾기.로딩표시.isVisible(), 버튼글자: (await 찾기.받기.innerText()).trim() },
        { 로딩표시: true, 버튼글자: '' },
      );
    });
  } finally {
    await 붙잡음?.풀기();
  }
});
