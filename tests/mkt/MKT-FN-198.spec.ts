import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내글만들기, 댓글목록받기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-198',
  name: '공백만 적고 등록하면 토스트 「댓글 내용을 입력하세요」가 보인다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 글이 있다'],
  techniques: ['동등 분할', '결정 테이블'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);
    let 글번호 = 0;

    await test.step('새로 만든 회원으로 로그인하고 글을 만든다', async () => {
      await 회원로그인(page.request, 정리);
      글번호 = (await 내글만들기(page.request, 정리)).id;
    });

    await test.step('내 글 상세를 열고 댓글 입력칸이 보이는지 확인한다', async () => {
      await 안내창끄기(page);
      await 상세.열기(글번호);
      await 상세.댓글입력칸.waitFor();
      await verify('댓글 입력칸이 보인다', await 상세.댓글입력칸.isVisible(), true, { blocker: true });
    });

    await test.step('댓글 입력칸에 공백만 적고 「등록」을 누른다', async () => {
      await 상세.댓글쓰고등록하기('   ');
      const 토스트 = await 상세.토스트.기다리기('댓글 내용을 입력하세요');
      await verify('공백만 적고 등록하면 토스트 「댓글 내용을 입력하세요」가 보인다', await 토스트.isVisible(), true);
      await verify('공백 댓글은 댓글 목록에 늘지 않는다', (await 댓글목록받기(page.request, 글번호)).length, 0);
    });
  } finally {
    await 정리.비우기();
  }
});
