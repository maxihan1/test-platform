import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 게시글제목기다리기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-018',
  name: '「최신글」 탭을 누르면 작성 순 글 5건이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('홈 「최신글」 탭을 누른다', async () => {
    await 방해막기(page);
    await 홈.추천까지열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    const 작성순 = ((await (await page.request.get('/api/posts?sort=latest&size=5')).json()) as { items: { title: string }[] }).items.map((글) => 글.title);
    await 홈.최신글탭.click();
    await 홈.글링크들.first().waitFor();
    await verify(
      '「최신글」 탭을 누르면 작성 순 글 5건이 보인다',
      { 건수: await 홈.글링크들.count(), 제목들: await 홈.글제목들(), 최신글고름: await 홈.최신글탭.getAttribute('aria-selected') },
      { 건수: 5, 제목들: 작성순, 최신글고름: 'true' },
    );
  });

  await test.step('홈 탭의 첫 글 제목을 누른다', async () => {
    const 제목 = (await 홈.글제목들())[0] ?? '';
    await 홈.글링크들.first().click();
    await 게시글제목기다리기(page, 제목);
    await verify('홈 탭의 글 제목을 누르면 그 게시글 상세로 간다', /^\/board\/\d+$/.test(new URL(page.url()).pathname), true);
  });
});
