import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 응답고쳐걸기, 일부막기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-017',
  name: '공지 팝업 설정이 꺼짐이면 홈 화면에 공지 팝업이 뜨지 않는다',
  platforms: ['desktop'],
  precondition: ['공지 팝업 설정 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 창 = new 모달(page);
  let 풀기: (() => Promise<void>) | undefined;

  try {
    await test.step('공지 팝업 설정을 꺼짐으로 주고 홈 화면을 연다', async () => {
      await 일부막기(page, { 쿠키: true, 설문: true });
      풀기 = await 응답고쳐걸기(page.context(), /\/api\/settings$/, (본문) => ({ ...본문, noticePopup: false }));
      await 홈.추천까지열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      const 설정 = (await page.evaluate(async () => (await fetch('/api/settings')).json())) as { noticePopup: boolean };
      await verify('공지 팝업 설정 응답이 꺼짐이다', 설정.noticePopup, false, { blocker: true });
      await verify('공지 팝업 설정이 꺼짐이면 홈 화면에 공지 팝업이 뜨지 않는다', await 창.창.isVisible(), false);
    });
  } finally {
    await 풀기?.();
  }
});
