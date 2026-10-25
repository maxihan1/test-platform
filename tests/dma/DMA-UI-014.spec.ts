import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-014',
  name: '상품 목록의 판매가는 「39,000원」처럼 천 단위 쉼표와 「원」으로 적혀 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 상품 목록이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록의 판매가를 확인한다', async () => {
    const 판매가들 = await 목록.보이는판매가들();
    const 보임 = await verify('상품 목록에 판매가가 보인다', 판매가들.length > 0, true);
    const 어긋난글 = 판매가들.filter((글) => !/^\d{1,3}(,\d{3})*원$/.test(글)).join(', ');
    const 꼴 = await verify('천 단위 쉼표와 「원」 꼴이 아닌 판매가가 없다', 어긋난글, '');
    await verify('상품 목록의 판매가는 「39,000원」처럼 천 단위 쉼표와 「원」으로 적혀 보인다', 보임 && 꼴, true);
  }, { capture: true });
});
