import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-016',
  name: '홈의 추천 상품은 설명이 말풍선으로 뜨고 좌우로 넘겨 볼 수 있으며 순서가 바뀐다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page, request }) => {
  const 홈 = new 홈화면(page);

  await test.step('추천 상품 카드에 마우스를 올린다', async () => {
    await 홈.공지팝업을치운다();
    await 홈.쿠키띠를치운다();
    await 홈.설문을치운다();
    await 홈.열기();
    await 홈.추천카드.first().waitFor();
    const 번호 = ((await 홈.추천카드.first().getAttribute('href')) ?? '').replace('/shop/', '');
    const 설명 = ((await (await request.get(`/api/products/${번호}`)).json()) as { summary: string }).summary;
    await 홈.추천카드.first().hover();
    const 말풍선 = 홈.추천카드.first().getByRole('tooltip');
    await 말풍선.waitFor();
    await verify('상품 카드에 마우스를 올리면 상품 설명 한 줄이 말풍선으로 뜬다', [await 말풍선.isVisible(), await 말풍선.innerText()], [true, 설명]);
  });

  await test.step('추천 상품 줄에서 「다음」을 누른다', async () => {
    const 전 = await 홈.추천줄가로위치();
    await 홈.추천다음.click();
    const 넘어감 = await 홈.추천줄이넘어갈때까지기다린다();
    await verify('추천 상품은 좌우로 넘겨 볼 수 있다', [전, 넘어감], [0, true]);
  });

  await test.step('홈 화면을 여러 번 새로 연다', async () => {
    const 순서들: string[] = [];
    for (let 번 = 0; 번 < 4; 번 += 1) {
      await 홈.열기();
      await 홈.추천카드.first().waitFor();
      순서들.push((await 홈.추천순서()).join(','));
    }
    await verify('홈에 들어올 때마다 추천 상품 순서가 바뀐다', new Set(순서들).size > 1, true);
  });
});
