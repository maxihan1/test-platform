import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 고유낱말 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-505',
  name: '글쓰기 「등록」을 빠르게 두 번 누르면 글이 하나만 생긴다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 제목 = 고유낱말('두번글');
  const 만든글: number[] = [];

  try {
    await test.step('일회용 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 일회용회원으로로그인(page);
      await 안내창막기(page);
      await 쓰기.열기();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.큰제목.isVisible(), true, { blocker: true });
    });

    await test.step('글쓰기 「등록」을 빠르게 두 번 누른다', async () => {
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: '빠르게 두 번 눌러 등록하는 본문입니다 열 글자가 넘습니다' });
      await Promise.all([page.waitForURL(/\/board\/\d+$/), 쓰기.등록.dblclick()]);
      await 상세.그려질때까지();
      const 응답 = await page.request.get(`/api/posts?field=title&q=${encodeURIComponent(제목)}`);
      const 찾음 = ((await 응답.json()) as { items: { id: number }[] }).items;
      for (const 글 of 찾음) 만든글.push(글.id);
      await verify('글쓰기 「등록」을 빠르게 두 번 누르면 글이 하나만 생긴다', 찾음.length, 1);
    });
  } finally {
    for (const 번호 of 만든글) await 글지우기(page.request, 번호);
  }
});
