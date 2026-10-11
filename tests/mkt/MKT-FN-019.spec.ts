import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 안정될때까지읽기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-019',
  name: '「추천 상품 다음」 을 누르면 추천 상품이 옆으로 넘어간다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  let 처음순서: string[] = [];

  await test.step('「추천 상품 다음」 버튼을 누른다', async () => {
    await 방해막기(page);
    await 홈.추천까지열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    처음순서 = await 홈.추천카드이름들();
    const 전 = await 홈.추천행.evaluate((행) => 행.scrollLeft);
    await 홈.추천다음.click();
    const 후 = await 안정될때까지읽기(() => 홈.추천행.evaluate((행) => 행.scrollLeft));
    await verify('「추천 상품 다음」 을 누르면 추천 상품이 옆으로 넘어간다', 후 > 전, true);
  });

  await test.step('홈 화면을 다시 연다', async () => {
    await 홈.추천까지열기();
    const 다시 = await 홈.추천카드이름들();
    await verify('홈 화면을 다시 열면 추천 상품 순서가 바뀐다', JSON.stringify(다시) !== JSON.stringify(처음순서), true);
  });

  await test.step('추천 상품 카드에 마우스를 올린다', async () => {
    const 이름 = (await 홈.추천카드이름들())[0] ?? '';
    const 목록 = ((await (await page.request.get('/api/products?size=8')).json()) as { items: { name: string; summary: string }[] }).items;
    const 설명 = 목록.find((상품) => 상품.name === 이름)?.summary;
    await 홈.추천카드.first().hover();
    await verify(
      '추천 상품 카드에 마우스를 올리면 상품 설명 한 줄이 말풍선으로 보인다',
      { 보임: await 홈.첫카드말풍선.isVisible(), 글: await 홈.첫카드말풍선.innerText() },
      { 보임: true, 글: 설명 },
    );
  });
});
