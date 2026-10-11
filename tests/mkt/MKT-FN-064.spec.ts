import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 글머리, 등록뒤글번호 } from './helpers/board.helper.js';
import { 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-064',
  name: '제목에 공백만 넣고 등록하면 빈 제목처럼 글이 등록되지 않는다',
  platforms: ['desktop'],
  precondition: ['회원으로 글쓰기 화면을 열었다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 글쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);
  const 만든글들: number[] = [];

  try {
    await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      await 글쓰기.열기();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('글쓰기 화면 제목이 「글쓰기」 이다', await 글쓰기.화면제목.innerText(), '글쓰기', { blocker: true });
    });

    await test.step('제목에 공백만 넣고 분류와 본문을 채워 「등록」 을 누른다', async () => {
      await 글쓰기.채우기({ 분류: '자유', 제목: '     ', 본문: '제목이 공백뿐인 글의 본문입니다.' });
      const 응답 = await 글쓰기.등록누르고응답받기();
      const 번호 = await 등록뒤글번호(page, 응답);
      if (번호 !== null) 만든글들.push(번호);
      await verify('제목에 공백만 넣고 등록하면 빈 제목처럼 글이 등록되지 않는다', { 등록됨: 응답.ok(), 주소: new URL(page.url()).pathname }, { 등록됨: false, 주소: '/board/write' });
    });
  } finally {
    for (const 번호 of 만든글들) await 글지우기(page.request, 번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
