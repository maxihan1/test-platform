import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-418',
  name: '1:1 문의 내용 칸 아래에 「0/1000」 글자 수가 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 문의 = new 문의화면(page);
  const 머리 = new 머리글(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('회원으로 1:1 문의 화면을 연다', async () => {
    await 문의.열기();
    await verify('1:1 문의 화면 제목이 보인다', await 문의.제목.isVisible(), true, { blocker: true });
    await verify(
      '1:1 문의 내용 칸 아래에 「0/1000」 글자 수가 보인다',
      { 글자수: await 문의.글자수.innerText(), 내용칸아래: await 문의.글자수가내용칸아래에있는가() },
      { 글자수: '0/1000', 내용칸아래: true },
    );
  });
});
