import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-113',
  name: '검색어 1자로 검색하면 토스트 「검색어를 2자 이상 입력하세요」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    한글자검색어: z.string().min(1).describe('토스트를 띄울 검색어 — 1자').default('가'),
    두글자검색어: z.string().min(2).describe('결과가 나오는 검색어 — 2자 · 제목에 든 낱말').default('후기'),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 목록 = new 게시판목록화면(page);
  const 알림 = new 토스트(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await page.clock.install();
    await 안내창막기(page);
    await 목록.열기();
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 검색어 1자로 검색한다', async () => {
    await 목록.검색하기(params.한글자검색어);
    await 알림.글('검색어를 2자 이상 입력하세요').waitFor();
    await verify('검색어 1자로 검색하면 토스트 「검색어를 2자 이상 입력하세요」가 보인다', await 알림.글('검색어를 2자 이상 입력하세요').isVisible(), true);
  });

  await test.step('게시판 검색어 2자로 검색한다', async () => {
    await page.clock.runFor(3000);
    await 알림.모두.first().waitFor({ state: 'detached' });
    await 목록.검색하기(params.두글자검색어);
    await 목록.그려질때까지();
    const 토스트없음 = await verify('토스트가 보이지 않는다', await 알림.모두.count(), 0);
    const 결과있음 = await verify('검색 결과가 보인다', (await 목록.일반행들()).length > 0, true);
    await verify('검색어 2자로 검색하면 토스트 없이 검색 결과가 보인다', 토스트없음 && 결과있음, true);
  });
});
