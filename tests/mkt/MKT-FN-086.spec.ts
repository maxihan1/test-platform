import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 옵션상품번호 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-086',
  name: '리뷰 탭을 처음 누르면 리뷰 목록을 불러와 보여 준다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 상세 화면을 연다', async () => {
    await 방해막기(page);
    await 상세.열기(옵션상품번호);
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('리뷰 탭을 처음 누른다', async () => {
    const 개수 = Number(((await 상세.탭(/^리뷰/).innerText()).match(/\d+/) ?? ['0'])[0]);
    await 상세.탭(/^리뷰/).click();
    await 상세.리뷰불러오는중.waitFor({ state: 'detached' });
    await verify('리뷰 탭을 처음 누르면 리뷰 목록을 불러와 보여 준다', await 상세.리뷰들.count(), 개수);
  });

  await test.step('상품 상세에서 5초를 기다린다', async () => {
    await page.waitForTimeout(5500);
    const 숫자 = Number(((await 상세.시청수.innerText()).match(/\d+/) ?? ['0'])[0]);
    await verify('5초가 지나면 「{N}명이 보고 있어요」 의 숫자가 3~30 사이 값으로 바뀐다', 숫자 >= 3 && 숫자 <= 30, true);
  });
});
