import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, API로그인, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 이미지글만들기, 이미지주소, 작은이미지 } from './helpers/board.helper.js';
import { 글지우기, 댓글달기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-124',
  name: '게시글 상세에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문 · 첨부 이미지가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 첫댓글 = '첫째로 단 댓글';
  const 둘째댓글 = '둘째로 단 댓글';
  let 글번호 = 0;

  try {
    await test.step('첨부 이미지가 있고 댓글이 둘 달린 글을 만든다', async () => {
      await 방해막기(page);
      await API로그인(request, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(request, 글머리(spec.tcId));
      글번호 = await 이미지글만들기(request, { title: 고유제목(spec.tcId, '상세'), images: [이미지주소(작은이미지('a.png'))] });
      await 댓글달기(request, 글번호, 첫댓글);
      await 댓글달기(request, 글번호, 둘째댓글);
      const 읽은글 = await request.get(`/api/posts/${글번호}`);
      await verify('만든 글에 첨부 이미지가 하나 들어 있다', ((await 읽은글.json()) as { images: string[] }).images.length, 1, { blocker: true });
    });

    await test.step('첨부 이미지가 있는 게시글 상세를 연다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글불러오기기다리기();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await verify(
        '게시글 상세에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문 · 첨부 이미지가 보인다',
        await 상세.보이는요소들(),
        ['제목', '분류', '작성자', '작성일', '조회수', '본문', '첨부 이미지'],
      );
    });

    await test.step('댓글이 있는 게시글 상세를 연다', async () => {
      await verify(
        '게시글 상세 아래에 「댓글 {개수}」 제목과 댓글 목록이 오래된 순으로 보인다',
        { 제목: await 상세.댓글제목.innerText(), 순서: await 상세.댓글내용들.allInnerTexts() },
        { 제목: '댓글 2', 순서: [첫댓글, 둘째댓글] },
      );
      const 작성자들 = await 상세.댓글작성자들.allInnerTexts();
      const 시각들 = await 상세.댓글작성시각들.allInnerTexts();
      await verify(
        '각 댓글에 작성자 · 작성 시각 · 내용이 보인다',
        {
          작성자: 작성자들.length === 2 && 작성자들.every((글) => 글.trim() !== ''),
          시각: 시각들.length === 2 && 시각들.every((글) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(글)),
          내용: await 상세.댓글내용들.allInnerTexts(),
        },
        { 작성자: true, 시각: true, 내용: [첫댓글, 둘째댓글] },
      );
    });

    await test.step('회원으로 게시글 상세를 연다', async () => {
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await 상세.열기(글번호);
      await 상세.댓글불러오기기다리기();
      await verify('댓글 입력칸 오른쪽 아래에 「0/300」 이 보인다', await 상세.글자수자리(), { 글자: '0/300', 오른쪽: true, 아래: true });
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
    await 지난글치우기(request, 글머리(spec.tcId));
  }
});
