import { defineCase, test, verify } from '@platform/kit';
import { 쿠키띠와설문만막기 } from './helpers/browser.helper.js';
import { 나타났나, 사라졌나 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-384',
  name: '홈 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['공지 팝업을 닫아 두었다', '처음 방문한 브라우저다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 열고 공지 팝업을 닫아 둔다', async () => {
    await 쿠키띠와설문만막기(page);
    await 홈.열기();
    await 홈.공지팝업.waitFor();
    await 홈.공지닫기버튼.click();
    await verify('공지 팝업이 닫힌다', await 사라졌나(홈.공지팝업), true, { blocker: true });
  });

  await test.step('홈 화면에서 「다음」을 누른다', async () => {
    const 앞 = await 홈.현재배너번호();
    const 장수 = await 홈.배너점들.count();
    await 홈.다음화살표.click();
    await verify('홈 화면에서 「다음」을 누르면 배너가 다음 장으로 바뀐다', await 홈.배너장이자리잡았나((앞 % 장수) + 1), true);
  });

  await test.step('홈 화면에서 「이전」을 누른다', async () => {
    const 앞 = await 홈.현재배너번호();
    const 장수 = await 홈.배너점들.count();
    await 홈.이전화살표.click();
    await verify('홈 화면에서 「이전」을 누르면 배너가 앞 장으로 바뀐다', await 홈.배너장이자리잡았나(((앞 + 장수 - 2) % 장수) + 1), true);
  });

  await test.step('홈 화면에서 「2번 배너」를 누른다', async () => {
    await 홈.배너점(2).click();
    await verify('홈 화면에서 「2번 배너」를 누르면 배너가 2번째 장으로 바뀐다', await 홈.배너장이자리잡았나(2), true);
  });

  await test.step('홈 화면에서 「최신글」을 누른다', async () => {
    await 홈.최신글탭누르기();
    await verify(
      '홈 화면에서 「최신글」을 누르면 「최신글」 탭이 골라지고 최신 글 목록이 보인다',
      { 최신글선택: await 홈.최신글탭.getAttribute('aria-selected'), 글목록보임: await 홈.글제목링크들.first().isVisible() },
      { 최신글선택: 'true', 글목록보임: true },
    );
  });

  await test.step('홈 화면에서 「추천 상품 이전」을 누른다', async () => {
    await 홈.추천다음.click();
    await 홈.추천줄멈출때까지();
    const 앞 = await 홈.추천줄가로위치();
    await 홈.추천이전.click();
    await 홈.추천줄멈출때까지();
    await verify('홈 화면에서 「추천 상품 이전」을 누르면 추천 상품 줄이 앞으로 넘어간다', (await 홈.추천줄가로위치()) < 앞, true);
  });

  await test.step('홈 화면에서 「닫기」를 누른다', async () => {
    await 홈.열기();
    await 홈.공지팝업.waitFor();
    await 홈.공지닫기버튼.click();
    await verify('홈 화면에서 「닫기」를 누르면 공지 팝업이 닫힌다', await 사라졌나(홈.공지팝업), true);
  });

  await test.step('홈 화면에서 「공지 팝업 X」를 누른다', async () => {
    await 홈.열기();
    await 홈.공지팝업.waitFor();
    await 홈.공지X.click();
    await verify('홈 화면에서 「공지 팝업 X」를 누르면 공지 팝업이 닫힌다', await 사라졌나(홈.공지팝업), true);
  });

  await test.step('홈 화면에서 「이벤트 띠 X」를 누른다', async () => {
    await 나타났나(홈.이벤트띠글);
    await 홈.이벤트띠닫기.click();
    await verify('홈 화면에서 「이벤트 띠 X」를 누르면 이벤트 띠가 닫힌다', await 사라졌나(홈.이벤트띠), true);
  });
});
