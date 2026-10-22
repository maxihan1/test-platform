import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록읽기 } from './helpers/api.helper.js';
import { 내리며모으기 } from './helpers/list-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-091',
  name: '「전체」 목록은 첫 상품부터 추천 순서로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('상품 목록을 연다', async () => {
    const 첫쪽 = await 상품목록읽기(request, { page: 1, size: 10 });
    const 보인것 = await 목록.보이는상품명();
    const 첫상품 = await verify('첫 상품이 서버 목록의 첫 상품이다', 보인것[0] ?? '', 첫쪽.items[0]?.name ?? '');
    const 차례 = await verify(
      '보이는 상품이 서버 목록 차례와 같다',
      보인것.join(', '),
      첫쪽.items
        .slice(0, 보인것.length)
        .map((상품) => 상품.name)
        .join(', '),
    );
    await verify('「전체」 목록은 첫 상품부터 추천 순서로 보인다', 첫상품 && 차례, true);
  });

  await test.step('「전체」 목록 끝 가까이 내린다', async () => {
    const 둘째쪽 = await 상품목록읽기(request, { page: 2, size: 10 });
    const 모음 = await 내리며모으기(driver, 목록, 20);
    const 스무개 = await verify('목록에 상품이 20개 이상 보인다', 모음.length >= 20, true);
    const 다음 = await verify(
      '11번째부터 20번째 상품이 서버 목록 차례와 같다',
      모음.slice(10, 20).join(', '),
      둘째쪽.items.map((상품) => 상품.name).join(', '),
    );
    await verify('「전체」 목록 끝 가까이 내리면 다음 10개 상품이 더 붙는다', 스무개 && 다음, true);
  });
});
