import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 유행중화면 } from './pages/explore.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-034',
  name: '비회원 유행 중 화면에서 글을 누르면 그 글 상세로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 유행중화면(page);
  const 상세 = new 글상세화면(page);

  await test.step('비회원으로 유행 중 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('유행 중 화면에 「게시물」 탭이 보인다', await 화면.게시물탭.isVisible(), true, { blocker: true });
    const 글있음 = await 화면.첫글.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('유행 중 화면에 글이 보인다', 글있음, true, { blocker: true });
  });

  await test.step('비회원 유행 중 화면에서 글 본문을 누른다', async () => {
    await 화면.본문.click();
    const 도착 = await 상세.돌아가기.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 상세경로 = /^\/@[^/]+\/\d+$/.test(new URL(page.url()).pathname);
    await verify('비회원 유행 중 화면에서 글을 누르면 그 글 상세로 간다', 도착 && 상세경로, true);
  });
});
