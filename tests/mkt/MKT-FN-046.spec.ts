import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 글목록읽기 } from './helpers/board.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-046',
  name: '글이 11개 이상이면 첫 페이지에 공지를 뺀 글이 10개 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);

  await test.step('게시판 목록 첫 페이지를 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify('게시글이 11개 이상이다', (await 글목록읽기(request, { size: 11 })).items.length, 11, { blocker: true });
    await verify('글이 11개 이상이면 첫 페이지에 공지를 뺀 글이 10개 보인다', await 목록.일반행들.count(), 10);
  });

  await test.step('게시판 목록 2페이지를 연다', async () => {
    const 열한째 = (await 글목록읽기(request, { size: 11 })).items[10];
    await 목록.쪽누르기(2);
    await verify('첫 페이지 다음 11번째 글은 2페이지 맨 앞에 보인다', await 목록.일반행첫링크주소(), `/board/${열한째?.id}`);
  });
});
