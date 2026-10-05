import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-067',
  name: '「최신글」 탭을 누르면 글 5건이 작성 순으로 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '공지 팝업 · 설문은 이미 닫았다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 안내창끄기(page);
    await 홈.열기();
    await verify('비회원이다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('공지 팝업 · 설문은 이미 닫았다', [await 홈.공지팝업.count(), await 홈.설문.count()], [0, 0], { blocker: true });
  });

  await test.step('홈 화면에서 「최신글」 탭을 누른다', async () => {
    await 홈.게시글탭('최신글').click();
    await 홈.글목록.nth(4).getByRole('link').waitFor();
    const 전체 = (await (await page.request.get('/api/posts?size=500')).json()) as { items: { title: string; createdAt: number }[] };
    const 작성순 = [...전체.items].sort((앞, 뒤) => 뒤.createdAt - 앞.createdAt).slice(0, 5).map((글) => 글.title);
    await verify('「최신글」 탭을 누르면 글 5건이 작성 순으로 보인다', (await 홈.글제목들()).join(' · '), 작성순.join(' · '));
  });

  await test.step('「최신글」 탭의 첫 글 제목을 누른다', async () => {
    const 주소 = await 홈.첫글주소();
    await 홈.글목록.first().getByRole('link').click();
    await 홈.게시글상세제목.waitFor();
    await verify('그 글의 게시글 상세 화면으로 간다', new URL(page.url()).pathname, 주소);
  });
});
