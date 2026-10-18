import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-034',
  name: '배너 좌우에 「이전」 · 「다음」 화살표와 아래에 점 3개가 보인다',
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

  await test.step('홈 화면 배너 영역을 확인한다', async () => {
    const 배치 = await 홈.배너배치();
    await verify(
      '배너 좌우에 「이전」 · 「다음」 화살표와 아래에 점 3개가 보인다',
      { 이전: await 홈.이전화살표.isVisible(), 다음: await 홈.다음화살표.isVisible(), ...배치 },
      { 이전: true, 다음: true, 이전은왼쪽: true, 다음은오른쪽: true, 점은아래: true, 점개수: 3 },
    );
  });
});
