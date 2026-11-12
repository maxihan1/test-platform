import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 사용자명규칙폼화면 } from './pages/username-block-form.page.js';
import { 사용자명규칙목록화면 } from './pages/username-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-195',
  name: '「새 유저네임 규칙 만들기」 화면에 「일치할 단어」 · 「비교 방식」 · 「승인을 통한 가입 허용」 · 「규칙 만들기」와 비슷한 문자 설명이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 사용자명규칙목록화면(page);
  const 폼 = new 사용자명규칙폼화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「사용자명 규칙」 화면에서 새 규칙 만들기 화면을 연다', async () => {
    await 목록.새로추가.click();
    await 폼.제목.waitFor();
    const 단어 = await verify('「일치할 단어」가 보인다', await 폼.단어칸.isVisible(), true);
    const 방식 = await verify('「비교 방식」이 보인다', await 폼.비교방식.isVisible(), true);
    const 승인 = await verify('「승인을 통한 가입 허용」이 보인다', await 폼.승인허용.isVisible(), true);
    const 만들기 = await verify('「규칙 만들기」가 보인다', await 폼.규칙만들기.isVisible(), true);
    const 설명 = await verify('비슷한 문자 설명이 보인다', await 폼.비슷한문자설명.isVisible(), true);
    await verify('「새 유저네임 규칙 만들기」 화면에 「일치할 단어」 · 「비교 방식」 · 「승인을 통한 가입 허용」 · 「규칙 만들기」와 비슷한 문자 설명이 보인다', 단어 && 방식 && 승인 && 만들기 && 설명, true);
  });
});
