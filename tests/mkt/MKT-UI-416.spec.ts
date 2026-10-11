import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-416',
  name: '글쓰기 제목과 본문 칸 아래에 「0/50」 · 「0/2000」 글자 수가 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 글쓰기 화면을 열었다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 글쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('회원으로 글쓰기 화면을 연다', async () => {
    await 글쓰기.열기();
    await verify('글쓰기 화면 제목이 「글쓰기」 이다', await 글쓰기.화면제목.innerText(), '글쓰기', { blocker: true });
    await verify(
      '글쓰기 제목과 본문 칸 아래에 「0/50」 · 「0/2000」 글자 수가 보인다',
      await 글쓰기.글자수자리읽기(),
      { 제목글자수: '0/50', 제목칸아래: true, 본문글자수: '0/2000', 본문칸아래: true },
    );
  });
});
