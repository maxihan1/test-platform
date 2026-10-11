import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-157',
  name: '글쓰기 분류 드롭다운에 「자유」 · 「질문」 · 「후기」 가 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 글쓰기 화면을 열었다', '회원이 직접 쓴 글이 하나 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 글쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);
  const 제목 = 고유제목(spec.tcId, '수정 화면');
  const 본문 = '수정 화면에 채워질 본문입니다.';
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 글을 하나 만든다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { category: '질문', title: 제목, content: 본문 });
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('회원으로 글쓰기 화면을 연다', async () => {
      await 글쓰기.열기();
      await verify('글쓰기 화면 제목이 「글쓰기」 이다', await 글쓰기.화면제목.innerText(), '글쓰기', { blocker: true });
      const 항목 = (await 글쓰기.분류글자들()).filter((글) => 글 !== '분류를 선택하세요');
      await verify('글쓰기 분류 드롭다운에 「자유」 · 「질문」 · 「후기」 가 보인다', 항목, ['자유', '질문', '후기']);
    });

    await test.step('내 글 수정 화면을 연다', async () => {
      await 글쓰기.수정열기(글번호);
      await verify('수정 화면 제목이 「게시글 수정」 이다', await 글쓰기.화면제목.innerText(), '게시글 수정', { blocker: true });
      await 글쓰기.제목채워질때까지기다리기();
      await verify(
        '게시글 수정 화면은 글쓰기와 같은 칸에 기존 분류 · 제목 · 본문이 채워져 보인다',
        {
          칸: [await 글쓰기.분류.isVisible(), await 글쓰기.제목칸.isVisible(), await 글쓰기.본문칸.isVisible()],
          분류: await 글쓰기.고른분류(),
          제목: await 글쓰기.제목칸.inputValue(),
          본문: await 글쓰기.본문칸.inputValue(),
        },
        { 칸: [true, true, true], 분류: '질문', 제목, 본문 },
      );
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
