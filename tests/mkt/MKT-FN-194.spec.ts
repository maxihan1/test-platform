import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자, 내글만들기, 댓글목록받기, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-194',
  name: '0자 댓글로 「등록」을 누르면 댓글이 등록되지 않는다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '내 글이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 상세 = new 게시글상세화면(page);
    const 삼백자 = 글자(300, '다');
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

    await test.step('댓글 입력칸을 비운 채 「등록」을 누른다', async () => {
      await 상세.댓글등록버튼.click();
      await 상세.토스트.전부.first().waitFor();
      await verify('0자 댓글로 「등록」을 누르면 댓글이 등록되지 않는다', (await 댓글목록받기(page.request, 글번호)).length, 0);
    });

    await test.step('댓글 입력칸에 1자 「네」를 적고 「등록」을 누른다', async () => {
      await 상세.댓글쓰고등록하기('네');
      await 상세.댓글('네').waitFor();
      await verify('1자 댓글은 등록되어 목록에 보인다', await 상세.댓글('네').isVisible(), true);
    });

    await test.step('댓글 입력칸에 300자를 적고 「등록」을 누른다', async () => {
      await 상세.댓글쓰고등록하기(삼백자);
      await 상세.댓글(삼백자).waitFor();
      await verify('300자 댓글은 등록되어 목록에 보인다', await 상세.댓글(삼백자).isVisible(), true);
    });

    await test.step('댓글 입력칸에 301자를 적는다', async () => {
      await 상세.댓글입력칸.fill(글자(301, '라'));
      await verify('댓글 입력칸에 301자를 적으면 300자까지만 들어간다', (await 상세.댓글입력칸.inputValue()).length, 300);
    });
  } finally {
    await 정리.비우기();
  }
});
