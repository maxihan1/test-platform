import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-337',
  name: '커뮤니티 목록 첫 쪽에 일반 글이 10건 보인다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  let 열한째제목 = '';

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('커뮤니티 목록 첫 쪽을 연다', async () => {
    await 방해막기(page);
    const 글들 = await page.request.get('/api/posts?size=100');
    열한째제목 = ((await 글들.json()) as { items: { title: string }[] }).items.at(10)?.title ?? '';
    await 목록.열기();
    await 목록.그려질때까지();
    await verify('커뮤니티 목록 화면이 열려 있다', 경로(page), 게시판목록화면.주소, { blocker: true });
    await verify('커뮤니티 목록 첫 쪽에 일반 글이 10건 보인다', await 목록.일반행.count(), 10);
  });

  await test.step('커뮤니티 목록에서 쪽 「2」를 누른다', async () => {
    await 목록.쪽누르기(2);
    await verify('쪽 「2」를 누르면 첫 쪽에 없던 11번째 글이 첫 일반 글로 보인다', (await 목록.일반행들()).at(0)?.제목, 열한째제목);
  });
});
