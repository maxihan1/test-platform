import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-016',
  name: '토스트가 뜨고 3초가 지나면 토스트가 사라진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    짧은검색어: z.string().min(1).describe('토스트를 띄울 검색어 — 1자').default('가'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 게시판목록화면(page);
  const 알림 = new 토스트(page);
  let 떴나 = false;

  await test.step('게시판 목록 화면을 연다', async () => {
    await page.clock.install();
    await 안내창막기(page);
    await 목록.열기();
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 1자로 검색해 토스트를 띄운다', async () => {
    await 목록.검색하기(params.짧은검색어);
    await 알림.모두.first().waitFor();
    떴나 = await verify('토스트가 뜬다', await 알림.모두.first().isVisible(), true, { blocker: true });
  });

  await test.step('토스트가 뜬 뒤 3초를 보낸다', async () => {
    await page.clock.runFor(3000);
    const 사라짐 = await verify('토스트가 사라진다', await 알림.모두.count(), 0);
    await verify('토스트가 뜨고 3초가 지나면 토스트가 사라진다', 떴나 && 사라짐, true);
  });
});
