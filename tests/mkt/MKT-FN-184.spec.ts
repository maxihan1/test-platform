import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-184',
  name: '상세의 「목록」을 누르면 들어오기 전의 「질문」 탭 「2」 페이지 목록으로 돌아간다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 상세 = new 게시글상세화면(page);

  await test.step('게시판 「질문」 탭 「2」 페이지에서 글을 열고 상세의 「목록」을 누른다', async () => {
    await 안내창끄기(page);
    await 목록.열기();
    await 목록.탭누르고기다리기('질문');
    await 목록.쪽누르고기다리기(2);
    const 글제목 = (await 목록.일반글읽기())[0]?.제목 ?? '';
    await 목록.글열기(글제목);
    await 상세.제목.waitFor();
    await 상세.목록버튼.click();
    await 목록.표기다리기();
    const 상태 = await 목록.상태읽기();
    await verify('상세의 「목록」을 누르면 들어오기 전의 「질문」 탭 「2」 페이지 목록으로 돌아간다', [상태.탭, 상태.쪽], ['질문', 2]);
  });
});
