import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 전체상품 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-211',
  name: '최대 가격 0원이면 0원 넘는 상품이 하나도 안 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    lowPrice: z.number().describe('슬라이더 아래쪽 끝 값(원)').default(0),
    highPrice: z.number().describe('슬라이더 위쪽 끝 값(원)').default(500000),
    overPrice: z.number().describe('위쪽 끝을 넘는 값(원)').default(500001),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);
  const 상품들 = await 전체상품(page.request);

  await test.step('최대 가격 슬라이더를 0원으로 옮긴다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.최대가격정하기(params.lowPrice);
    await 목록.목록다시나올때까지();
    await verify('최대 가격 0원이면 0원 넘는 상품이 하나도 안 보인다', await 목록.카드들.count(), 0);
  });

  await test.step('최대 가격 슬라이더를 500,000원으로 옮긴다', async () => {
    await 목록.최대가격정하기(params.highPrice);
    await 목록.목록다시나올때까지();
    await verify('최대 가격 500,000원이면 전체 상품 수와 같은 수가 보인다', await 목록.총개수.innerText(), `총 ${상품들.length}개`);
  });

  await test.step('최대 가격 슬라이더 값을 500,001원으로 넣는다', async () => {
    await 목록.최대가격범위밖값넣기(params.overPrice);
    await verify('최대 가격 슬라이더는 500,001원을 넣어도 500,000원에 머문다', await 목록.최대가격.inputValue(), '500000');
  });
});
