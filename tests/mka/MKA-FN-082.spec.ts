import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록읽기 } from './helpers/api.helper.js';
import { 내리며모으기 } from './helpers/list-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-082',
  name: '「도서」 칩을 누르면 목록에 도서 상품만 보인다',
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

  await test.step('상품 목록에서 「도서」 칩을 누른다', async () => {
    const 도서 = await 상품목록읽기(request, { category: '도서', size: 50 });
    await 목록.칩누르기('도서');
    const 바뀜 = await verify('「총 {N}개」가 도서 상품 수와 같다', await 목록.총개수바뀔때까지(`총 ${도서.total}개`), true);
    const 보인것 = await 내리며모으기(driver, 목록, 도서.total);
    const 있음 = await verify('도서 상품이 보인다', 보인것.length > 0, true);
    const 이름들 = 도서.items.map((상품) => 상품.name);
    const 다른것 = await verify('도서가 아닌 상품이 보이지 않는다', 보인것.filter((이름) => !이름들.includes(이름)).join(', '), '');
    await verify('「도서」 칩을 누르면 목록에 도서 상품만 보인다', 바뀜 && 있음 && 다른것, true);
  });
});
