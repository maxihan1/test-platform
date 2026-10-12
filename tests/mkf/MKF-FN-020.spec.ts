import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디, 초점있나 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-020',
  name: '확대 보기 모달을 닫으면 초점이 큰 이미지 버튼으로 돌아간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('상품 상세 화면이 열렸는지 확인한다', async () => {
    await 방해막기(page);
    await 상세.열기(1);
    await 상세.화면기다리기();
    await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('상품 상세에서 연 확대 보기 모달을 ESC 로 닫는다', async () => {
    await 상세.큰이미지버튼.click();
    await 상세.확대위치.waitFor();
    await page.keyboard.press('Escape');
    await 상세.확대창.waitFor({ state: 'detached' });
    await verify('확대 보기 모달을 닫으면 초점이 큰 이미지 버튼으로 돌아간다', await 초점있나(상세.큰이미지버튼), true);
  });
});
