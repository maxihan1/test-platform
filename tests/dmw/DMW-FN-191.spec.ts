import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-191',
  name: '가격 슬라이더를 150,000원에 두면 옆에 「~ 150,000원」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    최대가격: z.number().describe('슬라이더에 둘 최대 가격 — 0~500,000원, 10,000원 단위').default(150000),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('가격 슬라이더를 150,000원에 둔다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.최대가격두기(params.최대가격);
    await verify('가격 슬라이더를 150,000원에 두면 옆에 「~ 150,000원」이 보인다', await 목록.가격글.innerText(), `~ ${params.최대가격.toLocaleString('ko-KR')}원`);
  });
});
