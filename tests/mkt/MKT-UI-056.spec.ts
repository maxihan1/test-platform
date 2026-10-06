import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내글만들기, 이미지주소, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-056',
  name: '게시글 상세에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문이 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '이미지를 첨부한 내 글이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);
    let 글번호 = 0;
    let 본문 = '';

    await test.step('새로 만든 회원으로 로그인하고 이미지를 첨부한 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      const 글 = await 내글만들기(page.request, 정리, { images: [이미지주소()] });
      글번호 = 글.id;
      본문 = 글.content;
    });

    await test.step('내 글 상세를 연다', async () => {
      await 안내창끄기(page);
      await 상세.열기(글번호);
      await verify('내 글 상세에 본문이 보인다', await 상세.본문(본문).isVisible(), true, { blocker: true });
      const 보임 = await Promise.all([
        상세.제목.isVisible(),
        상세.분류.isVisible(),
        상세.작성자.isVisible(),
        상세.작성일.isVisible(),
        상세.조회수.isVisible(),
        상세.본문(본문).isVisible(),
      ]);
      await verify('게시글 상세에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문이 보인다', 보임.every(Boolean), true);
      await verify('게시글 상세에 첨부 이미지가 보인다', await 상세.첨부이미지.isVisible(), true);
    });
  } finally {
    await 정리.비우기();
  }
});
