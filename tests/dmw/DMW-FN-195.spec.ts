import { defineCase, test, verify } from '@platform/kit';

import { 전체상품이름들, 정렬한첫쪽 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-195',
  name: '필터를 바꾸면 위쪽 「총 <N>개」가 조건에 맞는 상품 수로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 상품목록화면(page);
  const 식품수 = (await 전체상품이름들(request, (하나) => 하나.category === '식품')).length;
  const 낮은순 = await 정렬한첫쪽(request, 'priceAsc');
  await 안내창막기(page);

  await test.step('카테고리 「식품」을 고른다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.카테고리켜기('식품');
    await 목록.카드들.first().waitFor();
    await verify('필터를 바꾸면 위쪽 「총 <N>개」가 조건에 맞는 상품 수로 바뀐다', await 목록.총개수읽기(), 식품수);
  });

  await test.step('목록을 내린 뒤 정렬을 바꾼다', async () => {
    await 목록.카테고리끄기('식품');
    await 목록.카드들.first().waitFor();
    await 목록.다음묶음불러오기();
    await verify('카드 24개까지 이어 붙어 있다', await 목록.카드수(), 24, { blocker: true });
    await 목록.정렬고르기('낮은 가격순');
    await 목록.카드들.first().waitFor();
    const 열두개 = await verify('정렬을 바꾸면 목록이 12개로 다시 나온다', await 목록.카드수(), 12);
    const 첫카드 = await verify('맨 앞 카드가 새 정렬의 첫 상품이다', (await 목록.카드이름들())[0], 낮은순[0].name);
    await verify('정렬을 바꾸면 목록이 처음 12개부터 다시 나온다', 열두개 && 첫카드, true);
  });
});
