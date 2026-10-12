import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 재고많은상품 } from './helpers/shop-tools.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-148',
  name: '확대 보기 모달에서 → 키를 치면 위치가 「2 / 4」로 바뀐다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  const 많은 = await 재고많은상품(page.request);

  await test.step('상품 상세 화면을 준비한다', async () => {
    await 상세.열기(많은.id);
  });

  await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
    await 상세.화면기다리기();
    await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('이미지 확대 보기 모달을 연다', async () => {
    await 상세.큰이미지버튼.click();
    await 상세.확대위치.waitFor();
  });

  await test.step('이미지 확대 보기 모달이 열렸는지 확인한다', async () => {
    await verify('이미지 확대 보기 모달이 보인다', await 상세.확대창.isVisible(), true, { blocker: true });
  });

  await test.step('확대 보기 모달에서 → 키를 친다', async () => {
    await page.keyboard.press('ArrowRight');
    await verify('확대 보기 모달에서 → 키를 치면 위치가 「2 / 4」로 바뀐다', await 상세.확대위치.innerText(), '2 / 4');
  });

  await test.step('확대 보기 모달에서 다음 화살표 버튼을 누른다', async () => {
    const 전 = await 상세.확대위치번호();
    await 상세.확대다음.click();
    await verify('확대 보기 모달에서 다음 화살표를 누르면 다음 이미지로 넘어간다', (await 상세.확대위치번호()) - 전, 1);
  });

  await test.step('확대 보기 모달에서 ESC 를 친다', async () => {
    await page.keyboard.press('Escape');
    await 상세.확대창.waitFor({ state: 'detached' });
    await verify('확대 보기 모달에서 ESC 를 치면 모달이 닫힌다', await 상세.확대창.count(), 0);
  });

  await test.step('이미지 확대 보기 모달을 다시 연다', async () => {
    await 상세.큰이미지버튼.click();
    await 상세.확대위치.waitFor();
  });

  await test.step('이미지 확대 보기 모달이 다시 열렸는지 확인한다', async () => {
    await verify('이미지 확대 보기 모달이 보인다', await 상세.확대창.isVisible(), true, { blocker: true });
  });

  await test.step('확대 보기 모달에서 X 를 누른다', async () => {
    await 상세.확대닫기.click();
    await 상세.확대창.waitFor({ state: 'detached' });
    await verify('확대 보기 모달에서 X 를 누르면 모달이 닫힌다', await 상세.확대창.count(), 0);
  });
});
