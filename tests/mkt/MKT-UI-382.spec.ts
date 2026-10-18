import { defineCase, test, verify } from '@platform/kit';
import { 공지와설문만막기 } from './helpers/browser.helper.js';
import { 나타났나, 사라졌나 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-382',
  name: '공통 버튼 반응 — 상담하기와 쿠키 동의',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '처음 방문한 브라우저다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 공지와설문만막기(page);
    await 홈.열기();
    await 홈.바닥글.쿠키띠.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('쿠키 동의 기록이 없다', await page.evaluate(() => localStorage.getItem('dm_cookie_ok') === null), true, { blocker: true });
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「상담하기」를 누른다', async () => {
    await 홈.상담창.상담버튼.click();
    await verify('홈 화면 머리글 · 바닥글에서 「상담하기」를 누르면 상담 창이 열린다', await 나타났나(홈.상담창.창), true);
    await 홈.상담창.닫기.click();
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「동의」를 누른다', async () => {
    await 홈.쿠키동의누르기();
    await verify('홈 화면 머리글 · 바닥글에서 「동의」를 누르면 쿠키 안내 띠가 사라진다', await 사라졌나(홈.바닥글.쿠키띠), true);
  });
});
