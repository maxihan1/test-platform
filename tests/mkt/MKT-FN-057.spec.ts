import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-057',
  name: '늦게 도착한 이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 배너와 탭 사이에 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['공지 팝업을 닫아 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('공지 팝업이 보이지 않는다', await 홈.공지팝업보이나(), false, { blocker: true });
  });

  await test.step('홈 화면을 열고 이벤트 띠가 들어오기를 기다린다', async () => {
    await 홈.이벤트띠글.waitFor();
    const 배너 = await 홈.배너.boundingBox();
    const 띠 = await 홈.이벤트띠.boundingBox();
    const 탭 = await 홈.인기글탭.boundingBox();
    await verify(
      '늦게 도착한 이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 배너와 탭 사이에 보인다',
      {
        보임: await 홈.이벤트띠글.isVisible(),
        배너아래: !!배너 && !!띠 && 띠.y >= 배너.y + 배너.height - 1,
        탭위: !!띠 && !!탭 && 띠.y + 띠.height <= 탭.y + 1,
      },
      { 보임: true, 배너아래: true, 탭위: true },
    );
  });
});
