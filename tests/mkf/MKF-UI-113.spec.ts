import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-113',
  name: '게시판 정렬 드롭다운은 처음에 「최신순」이고 「조회순」 · 「좋아요순」이 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('게시판 목록을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await 목록.그려질때까지();
    await verify(
      '게시판 정렬 드롭다운은 처음에 「최신순」이고 「조회순」 · 「좋아요순」이 있다',
      { 처음선택: await 목록.선택된정렬(), 항목: (await 목록.정렬항목들.allInnerTexts()).join(' · ') },
      { 처음선택: '최신순', 항목: '최신순 · 조회순 · 좋아요순' },
    );
  });
});
