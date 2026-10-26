import { defineCase, test, verify } from '@platform/kit';

import { 넉넉한상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-154',
  name: '확대 보기에서 오른쪽 화살표를 누르면 「2 / 4」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);

  await test.step('확대 보기에서 오른쪽 화살표를 누른다', async () => {
    await 상세.열기(상품.id);
    await 상세.확대열기();
    await verify('확대 보기가 열려 있고 「1 / 4」가 보인다', await 상세.확대위치글(), '1 / 4', { blocker: true });
    await 상세.확대다음.click();
    await 상세.확대이미지가바뀔때까지(2);
    await verify('확대 보기에서 오른쪽 화살표를 누르면 「2 / 4」가 보인다', await 상세.확대위치글(), '2 / 4');
  });

  await test.step('확대 보기에서 키보드 → 를 친다', async () => {
    await page.keyboard.press('ArrowRight');
    await 상세.확대이미지가바뀔때까지(3);
    await verify('확대 보기에서 → 키를 치면 다음 이미지로 넘어간다', await 상세.확대위치글(), '3 / 4');
  });

  await test.step('확대 보기에서 ESC 를 친다', async () => {
    await page.keyboard.press('Escape');
    await verify('확대 보기는 ESC 를 치면 닫힌다', await 상세.확대닫혔는가(), true);
  });

  await test.step('확대 보기의 X 를 누른다', async () => {
    await 상세.확대열기();
    await verify('확대 보기가 다시 열려 있다', await 상세.확대창.isVisible(), true, { blocker: true });
    await 상세.확대닫기.click();
    await verify('확대 보기는 X 를 누르면 닫힌다', await 상세.확대닫혔는가(), true);
  });
});
