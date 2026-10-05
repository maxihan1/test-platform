import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 글본문10자, 등록글정리, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-226',
  name: '글을 등록하면 방금 쓴 글의 상세 화면으로 간다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 쓰기 = new 글쓰기화면(page);
    const 상세 = new 게시글상세화면(page);
    const 글제목 = 고유이름('새로쓴글');

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(page.request, 정리);
      await 안내창끄기(page);
    });

    await test.step('글쓰기 화면에서 분류 · 제목 · 본문을 적고 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await verify('글쓰기 화면이 열린다', await 쓰기.제목글.isVisible(), true, { blocker: true });
      await 쓰기.채우기({ 분류: '자유', 제목: 글제목, 본문: 글본문10자 });
      await 쓰기.등록하기();
      await 상세.제목기다리기(글제목);
      const 번호 = 등록글정리(page.request, 정리, page.url());
      await verify('글을 등록하면 방금 쓴 글의 상세 화면으로 간다', await 상세.경로읽기(), `/board/${번호}`);
      const 토스트 = await 상세.토스트.기다리기('등록되었습니다');
      await verify('상세 화면에 토스트 「등록되었습니다」가 보인다', await 토스트.isVisible(), true);
    });
  } finally {
    await 정리.비우기();
  }
});
