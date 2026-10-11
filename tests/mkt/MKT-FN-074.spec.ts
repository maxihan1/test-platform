import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 하나만맞는가격 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-074',
  name: '조건에 맞는 상품이 없으면 「조건에 맞는 상품이 없습니다」 가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 목록 화면을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('가격 슬라이더를 0원으로 옮긴다', async () => {
    await 목록.가격옮기기(0);
    await 목록.불러오기끝기다리기();
    await verify('조건에 맞는 상품이 없으면 「조건에 맞는 상품이 없습니다」 가 보인다', await 목록.빈상태문구.isVisible(), true);
  });

  await test.step('맞는 상품이 하나뿐인 조건으로 필터를 고른다', async () => {
    await 목록.가격옮기기(await 하나만맞는가격(request));
    await 목록.불러오기끝기다리기();
    await verify(
      '조건에 맞는 상품이 하나면 카드 하나가 보이고 「조건에 맞는 상품이 없습니다」 는 보이지 않는다',
      { 카드: await 목록.카드.count(), 안내: (await 목록.빈상태문구.isVisible()) ? '보임' : '안 보임' },
      { 카드: 1, 안내: '안 보임' },
    );
  });
});
