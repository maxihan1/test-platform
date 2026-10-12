import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';
import { 경로, 보이는이름들 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-109',
  name: '비밀번호 찾기 화면에 아이디 입력칸 · 이메일 입력칸 · 「임시 비밀번호 받기」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('비밀번호 찾기 화면을 연다', async () => {
    await 방해막기(page);
    await 찾기.열기();
    await 찾기.제목.waitFor();
    await verify('비밀번호 찾기 화면이 열려 있다', 경로(page), 비밀번호찾기화면.주소, { blocker: true });
    await verify(
      '비밀번호 찾기 화면에 아이디 입력칸 · 이메일 입력칸 · 「임시 비밀번호 받기」 버튼이 보인다',
      await 보이는이름들({ '아이디 입력칸': 찾기.아이디, '이메일 입력칸': 찾기.이메일, '「임시 비밀번호 받기」 버튼': 찾기.받기 }),
      '아이디 입력칸, 이메일 입력칸, 「임시 비밀번호 받기」 버튼',
    );
  });
});
