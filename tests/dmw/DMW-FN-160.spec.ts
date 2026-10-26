import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-160',
  name: '제목을 비우고 등록하면 글쓰기 화면에 그대로 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);

  await test.step('일회용 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 일회용회원으로로그인(page);
    await 안내창막기(page);
    await 쓰기.열기();
    await 머리.그려질때까지();
    await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('제목을 비우고 「등록」을 누른다', async () => {
    await 쓰기.채우기({ 분류: '자유', 본문: '제목을 비우고 쓰는 본문입니다 열 글자가 넘습니다' });
    const 응답 = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/posts' && r.request().method() === 'POST');
    await 쓰기.등록.click();
    await 응답;
    await verify('제목을 비우고 등록하면 글쓰기 화면에 그대로 있다', await 쓰기.큰제목.isVisible(), true);
  });
});
