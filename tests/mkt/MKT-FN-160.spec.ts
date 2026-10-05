import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-160',
  name: '분류 · 정렬 · 페이지를 바꾼 목록을 새로 고치면 같은 조건의 목록이 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록에서 「질문」 탭 · 「조회순」 · 「2」 페이지로 바꾼 뒤 새로 고친다', async () => {
    await 안내창끄기(page);
    await 목록.열기();
    await 목록.탭누르고기다리기('질문');
    await 목록.정렬고르고기다리기('조회순');
    await 목록.쪽누르고기다리기(2);
    const 바꾼뒤 = await 목록.상태읽기();
    await verify('질문 탭 둘째 페이지 목록이 조회순으로 보인다', [바꾼뒤.탭, 바꾼뒤.정렬, 바꾼뒤.쪽], ['질문', '조회순', 2], { blocker: true });
    await 목록.새로고침하고기다리기();
    await verify('분류 · 정렬 · 페이지를 바꾼 목록을 새로 고치면 같은 조건의 목록이 보인다', await 목록.상태읽기(), 바꾼뒤);
  });

  await test.step('게시판 목록에서 검색어 「후기」로 제목을 검색한 뒤 새로 고친다', async () => {
    await 목록.열기();
    await 목록.검색하고기다리기('제목', '후기');
    const 검색뒤 = await 목록.상태읽기();
    await 목록.새로고침하고기다리기();
    await verify('검색한 목록을 새로 고쳐도 검색어 「후기」와 그 검색 결과가 그대로 보인다', await 목록.상태읽기(), 검색뒤);
  });

  await test.step('「질문」 탭 「2」 페이지에서 「1」 페이지를 누른 뒤 브라우저 뒤로 가기를 한다', async () => {
    await 목록.열기('category=질문&page=2');
    await 목록.현재쪽.filter({ hasText: /^2$/ }).waitFor();
    const 전 = await 목록.상태읽기();
    await 목록.쪽누르고기다리기(1);
    await 목록.뒤로가기하고기다리기(2);
    await verify('뒤로 가기를 하면 바로 전의 「질문」 탭 「2」 페이지 목록이 다시 보인다', await 목록.상태읽기(), 전);
  });
});
