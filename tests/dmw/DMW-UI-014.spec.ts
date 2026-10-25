import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-014',
  name: '토스트가 화면 아래 가운데에 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    짧은검색어: z.string().min(1).describe('검색어 — 1자').default('가'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 게시판목록화면(page);
  const 알림 = new 토스트(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 안내창막기(page);
    await 목록.열기();
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 1자로 검색해 토스트를 띄운다', async () => {
    await 목록.검색하기(params.짧은검색어);
    await 알림.모두.first().waitFor();
    const 상자 = await 알림.모두.first().boundingBox();
    const 화면 = page.viewportSize();
    if (상자 === null || 화면 === null) throw new Error('토스트나 화면 크기를 읽지 못했다');
    const 보임 = await verify('토스트가 보인다', await 알림.모두.first().isVisible(), true);
    const 가운데 = await verify('토스트가 화면 가로 가운데에 있다', Math.abs(상자.x + 상자.width / 2 - 화면.width / 2) <= 2, true);
    const 아래 = await verify('토스트가 화면 아래쪽에 있다', 상자.y + 상자.height / 2 > 화면.height / 2, true);
    await verify('토스트가 화면 아래 가운데에 보인다', 보임 && 가운데 && 아래, true);
  });
});
