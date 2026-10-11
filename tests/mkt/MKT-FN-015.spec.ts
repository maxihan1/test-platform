import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 응답고쳐걸기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-015',
  name: '노출 배너 응답이 두 장이면 홈 배너도 응답 순서대로 두 장만 보인다',
  platforms: ['desktop'],
  precondition: ['노출 배너 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  let 풀기: (() => Promise<void>) | undefined;

  try {
    await test.step('노출 배너 응답을 순서를 바꾼 두 장으로 주고 홈 화면을 연다', async () => {
      await 방해막기(page);
      const 원래 = ((await (await page.request.get('/api/banners')).json()) as { items: { title: string }[] }).items;
      await verify('노출 배너가 두 장 이상이다', 원래.length >= 2, true, { blocker: true });
      풀기 = await 응답고쳐걸기(page.context(), /\/api\/banners$/, (본문) => {
        const 목록 = 본문.items as unknown[];
        return { ...본문, items: [목록[1], 목록[0]] };
      });
      await 홈.열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await verify(
        '노출 배너 응답이 두 장이면 홈 배너도 응답 순서대로 두 장만 보인다',
        { 제목들: await 홈.슬라이드제목들(), 점수: await 홈.점들.count() },
        { 제목들: [원래[1]?.title, 원래[0]?.title], 점수: 2 },
      );
    });
  } finally {
    await 풀기?.();
  }
});
