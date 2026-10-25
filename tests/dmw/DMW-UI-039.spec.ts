import { defineCase, test, verify } from '@platform/kit';

import { 화면제목 } from './components/page-heading.component.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-039',
  name: '홈 글 탭의 글 제목을 누르면 그 글의 게시글 상세가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 제목 = new 화면제목(page);
  await 안내창막기(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
  });

  await test.step('홈 글 탭의 첫 글 제목을 누른다', async () => {
    const 누를글 = 홈.글링크들.first();
    const 글제목 = await 누를글.innerText();
    await 누를글.click();
    await 홈.게시글상세그려질때까지();
    await verify('홈 글 탭의 글 제목을 누르면 그 글의 게시글 상세가 보인다', await 제목.글(글제목).isVisible(), true);
  });
});
