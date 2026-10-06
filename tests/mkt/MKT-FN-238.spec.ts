import { defineCase, test, verify } from '@platform/kit';

import { 전체상품 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-238',
  name: '카테고리 「패션」을 켜면 패션 상품만 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 상품들 = await 전체상품(page.request);
  const 이름들 = (카테고리들: string[]): string =>
    상품들
      .filter((상품) => 카테고리들.includes(상품.category))
      .map((상품) => 상품.name)
      .sort()
      .join(', ');
  const 보이는이름들 = async (): Promise<string> => (await 목록.카드이름들()).sort().join(', ');

  await test.step('상품 목록을 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('필터에서 「패션」을 켠다', async () => {
    await 목록.카테고리('패션').check();
    await 목록.다시불러오기끝기다리기();
    await 목록.끝까지내리기();
    await verify('카테고리 「패션」을 켜면 패션 상품만 보인다', await 보이는이름들(), 이름들(['패션']));
  });

  await test.step('필터에서 「도서」를 더 켠다', async () => {
    await 목록.카테고리('도서').check();
    await 목록.다시불러오기끝기다리기();
    await 목록.끝까지내리기();
    await verify('「패션」과 「도서」를 함께 켜면 두 카테고리 상품이 같이 보인다', await 보이는이름들(), 이름들(['패션', '도서']));
  });

  await test.step('「패션」과 「도서」를 모두 끈다', async () => {
    await 목록.카테고리('패션').uncheck();
    await 목록.카테고리('도서').uncheck();
    await 목록.다시불러오기끝기다리기();
    await 목록.끝까지내리기();
    await verify('카테고리를 하나도 고르지 않으면 전체 상품이 보인다', await 보이는이름들(), 이름들(['패션', '전자기기', '도서', '식품']));
  });
});
