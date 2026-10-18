import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 가짜배너응답걸기, 실제배너목록 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-514',
  name: '배너 응답의 순서대로 3번째 · 1번째 배너 두 장만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['배너 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 홈 = new 홈화면(page);
  let 걷기: (() => Promise<void>) | undefined;

  try {
    await test.step('노출 배너가 3번째 · 1번째 두 장인 응답으로 홈 화면을 연다', async () => {
      await 방해창막기(page);
      const 배너들 = await 실제배너목록(request);
      const 셋째 = 배너들[2];
      const 첫째 = 배너들[0];
      await verify('배너가 3장 이상 있다', 셋째 !== undefined && 첫째 !== undefined, true, { blocker: true });
      걷기 = await 가짜배너응답걸기(page, [셋째, 첫째]);
      await 홈.열기();
      await verify(
        '배너 응답의 순서대로 3번째 · 1번째 배너 두 장만 보인다',
        { 제목들: await 홈.배너제목들.allInnerTexts(), 점개수: await 홈.배너점들.count() },
        { 제목들: [셋째?.title, 첫째?.title], 점개수: 2 },
      );
    });
  } finally {
    if (걷기) await 걷기();
  }
});
