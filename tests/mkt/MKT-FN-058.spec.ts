import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 이벤트띠응답늦추기 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-058',
  name: '이벤트 띠가 들어오면 그 아래 탭이 아래로 밀려난다',
  platforms: ['desktop', 'mobile'],
  precondition: ['공지 팝업을 닫아 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 늦춤 = await 이벤트띠응답늦추기(page);

  try {
    await test.step('이벤트 띠 응답을 늦추고 홈 화면을 연다', async () => {
      await 방해창막기(page);
      await 홈.열기();
      await verify('공지 팝업이 보이지 않는다', await 홈.공지팝업보이나(), false, { blocker: true });
      await verify('이벤트 띠가 아직 보이지 않는다', await 홈.이벤트띠.isVisible(), false, { blocker: true });
    });

    await test.step('이벤트 띠가 들어오기 전후 탭 위치를 견준다', async () => {
      const 앞 = await 홈.인기글탭.boundingBox();
      늦춤.풀기();
      await 홈.이벤트띠글.waitFor();
      const 뒤 = await 홈.인기글탭.boundingBox();
      await verify('이벤트 띠가 들어오면 그 아래 탭이 아래로 밀려난다', !!앞 && !!뒤 && 뒤.y > 앞.y, true);
    });
  } finally {
    늦춤.풀기();
    await 늦춤.걷기();
  }
});
