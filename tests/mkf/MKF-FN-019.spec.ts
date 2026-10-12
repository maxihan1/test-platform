import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디, 스크롤멈출때까지기다리기 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-019',
  name: '확대 보기 모달이 열린 동안 마우스 휠을 굴려도 뒤 화면이 스크롤되지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('화면 높이를 400px 로 줄인 상품 상세를 연다', async () => {
    await 방해막기(page);
    await page.setViewportSize({ width: 1280, height: 400 });
    await 상세.열기(1);
  });

  await test.step('상품 상세가 한 화면보다 긴지 확인한다', async () => {
    await 상세.화면기다리기();
    await verify(
      '상품 상세가 열려 있고 한 화면보다 길다',
      { 제목: await 상세.제목.isVisible(), 한화면보다김: await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight) },
      { 제목: true, 한화면보다김: true },
      { blocker: true },
    );
  });

  await test.step('상품 상세에서 확대 보기 모달을 연 뒤 마우스 휠을 굴린다', async () => {
    await 상세.큰이미지버튼.click();
    await 상세.확대위치.waitFor();
    await 스크롤멈출때까지기다리기(page);
    const 열었을때위치 = await page.evaluate(() => window.scrollY);
    await page.mouse.move(640, 200);
    await page.mouse.wheel(0, 600);
    await 스크롤멈출때까지기다리기(page);
    await verify('확대 보기 모달이 열린 동안 마우스 휠을 굴려도 뒤 화면이 스크롤되지 않는다', await page.evaluate(() => window.scrollY), 열었을때위치);
  });
});
