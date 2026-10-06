import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내글만들기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-229',
  name: '내 글의 「수정」을 누르면 기존 제목과 본문이 채워진 수정 화면이 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 글이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 쓰기 = new 글쓰기화면(page);
    const 상세 = new 게시글상세화면(page);
    let 글번호 = 0;
    let 글제목 = '';
    let 글본문 = '';

    await test.step('새로 만든 회원으로 로그인하고 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      const 글 = await 내글만들기(page.request, 정리);
      글번호 = 글.id;
      글제목 = 글.title;
      글본문 = 글.content;
    });

    await test.step('내 글 상세의 「수정」을 누른다', async () => {
      await 안내창끄기(page);
      await 상세.열기(글번호);
      await verify('내 글 상세에 「수정」 링크가 보인다', await 상세.수정링크.isVisible(), true, { blocker: true });
      await 상세.수정링크.click();
      await 쓰기.수정열림기다리기();
      await verify(
        '내 글의 「수정」을 누르면 기존 제목과 본문이 채워진 수정 화면이 보인다',
        { 화면: await 쓰기.수정제목글.isVisible(), 제목: await 쓰기.제목읽기(), 본문: await 쓰기.본문읽기() },
        { 화면: true, 제목: 글제목, 본문: 글본문 },
      );
    });
  } finally {
    await 정리.비우기();
  }
});
