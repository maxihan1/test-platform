import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-248',
  name: '리뷰 탭을 누르기 전에는 리뷰를 불러오지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 리뷰가 하나 이상 있는 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 리뷰요청 = (주소: string): boolean => /^\/api\/products\/\d+\/reviews$/.test(new URL(주소).pathname);
  let 요청수 = 0;
  page.on('request', (요청) => {
    if (리뷰요청(요청.url())) 요청수 += 1;
  });

  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이라 세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('상품 상세를 열고 리뷰 탭을 누르기 전 요청을 확인한다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.productId);
    await 상세.리뷰탭.waitFor();
    await 두프레임뒤(page);
    await verify('리뷰 탭을 누르기 전에는 리뷰를 불러오지 않는다', 요청수, 0);
  });

  await test.step('리뷰 탭을 처음 누른다', async () => {
    const 응답 = page.waitForResponse((r) => 리뷰요청(r.url()));
    await 상세.리뷰탭.click();
    await 응답;
    await 상세.리뷰들.first().waitFor();
    const 개수 = await 상세.리뷰개수읽기();
    await verify('리뷰 탭을 처음 누르면 리뷰 목록을 불러와 보여 준다', `${요청수}번 불러옴, 리뷰 ${await 상세.리뷰들.count()}개`, `1번 불러옴, 리뷰 ${개수}개`);
  });
});
