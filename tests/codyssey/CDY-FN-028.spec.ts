import { defineCase, test, verify } from '@platform/kit';

import { 공지사항화면 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-028',
  name: '공지사항 목록의 첫 글을 누르면 상세 화면에 「목록」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['공지사항 목록 화면이 열려 있다', '비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 화면 = new 공지사항화면(page);

  await test.step('공지사항 목록 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('공지사항 목록 화면의 첫 글을 확인한다', async () => {
    const 제목보임 = await 화면.목록제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('공지사항 목록 화면에 제목 「공지사항」이 보인다', 제목보임, true, { blocker: true });

    const 첫글보임 = await 화면.첫글
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('공지사항 목록에 첫 글이 보인다', 첫글보임, true, { blocker: true });
  });

  await test.step('목록의 첫 글을 누른다', async () => {
    await 화면.첫글열기();

    const 목록버튼보임 = await 화면.목록버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('공지사항 목록의 첫 글을 누르면 상세 화면에 「목록」 버튼이 보인다', 목록버튼보임, true);
  });
});
