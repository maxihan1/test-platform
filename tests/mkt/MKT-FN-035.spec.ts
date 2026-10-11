import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-035',
  name: '「최신글」 탭을 누르면 글 5건이 최근에 쓴 순으로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
  });

  await test.step('「인기글」 탭이 열려 있는지 확인한다', async () => {
    await 홈.글링크들.first().waitFor();
    await verify('홈 글 탭은 「인기글」이 선택되어 있다', await 홈.인기글탭.getAttribute('aria-selected'), 'true', { blocker: true });
  });

  await test.step('홈에서 「최신글」 탭을 누른다', async () => {
    await 홈.최신글탭.click();
    await 홈.글링크들.first().waitFor();
    const 보인글 = await 홈.글번호들();
    const 응답 = await page.request.get('/api/posts?sort=latest&size=100');
    const 전체 = ((await 응답.json()) as { items: { id: number; createdAt: number }[] }).items;
    const 최신다섯 = [...전체].sort((가, 나) => 나.createdAt - 가.createdAt).slice(0, 5).map((글) => 글.id);
    await verify('「최신글」 탭을 누르면 글 5건이 최근에 쓴 순으로 보인다', 보인글, 최신다섯);
  });
});
