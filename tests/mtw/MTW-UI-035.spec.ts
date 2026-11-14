import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 유행중화면 } from './pages/explore.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-035',
  name: '비회원 유행 중 화면에서 글의 「답장」을 누르면 로그인 안내 창이 뜬다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 유행중화면(page);

  await test.step('비회원으로 유행 중 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('유행 중 화면에 「게시물」 탭이 보인다', await 화면.게시물탭.isVisible(), true, { blocker: true });
    const 글있음 = await 화면.첫글.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('유행 중 화면에 글이 보인다', 글있음, true, { blocker: true });
  });

  await test.step('비회원 유행 중 화면에서 글의 「답장」을 누른다', async () => {
    await 화면.답장.click();
    const 떴다 = await 화면.안내창.창.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('비회원 유행 중 화면에서 글의 「답장」을 누르면 로그인 안내 창이 뜬다', 떴다, true);
    await 화면.안내창닫기();
  });

  await test.step('비회원 유행 중 화면에서 글의 「부스트」를 누른다', async () => {
    await 화면.부스트.click();
    const 떴다 = await 화면.안내창.창.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「부스트」도 로그인 안내 창을 띄운다', 떴다, true);
    await 화면.안내창닫기();
  });

  await test.step('비회원 유행 중 화면에서 글의 「좋아요」를 누른다', async () => {
    await 화면.좋아요.click();
    const 떴다 = await 화면.안내창.창.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「좋아요」도 로그인 안내 창을 띄운다', 떴다, true);
  });
});
