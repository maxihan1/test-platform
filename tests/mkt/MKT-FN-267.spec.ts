import { defineCase, test, verify } from '@platform/kit';

import { 임시회원로그인, type 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 회원정리 } from './components/shop-helpers.component.js';
import { 토스트 } from './components/feedback.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-267',
  name: '옵션을 고르지 않고 담으면 토스트 「옵션을 선택하세요」가 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인한다', async () => {
      내것.회원 = await 임시회원로그인(page.request);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 상세.열기(상품번호.니트가디건);
      await 머리.로그아웃버튼.waitFor();
      await verify('새로 만든 회원으로 로그인해 있다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('옵션이 있는 상품 상세에서 색상과 사이즈를 고르지 않고 「장바구니 담기」를 누른다', async () => {
      await 상세.장바구니담기버튼.click();
      await 알림.기다리기('옵션을 선택하세요');
      await verify('옵션을 고르지 않고 담으면 토스트 「옵션을 선택하세요」가 보인다', await 알림.문구('옵션을 선택하세요').first().isVisible(), true);
      await 알림.전부.first().waitFor({ state: 'detached' });
    });

    await test.step('색상만 고르고 「장바구니 담기」를 누른다', async () => {
      await 상세.색상상자.selectOption({ index: 1 });
      await 상세.장바구니담기버튼.click();
      await 알림.기다리기('옵션을 선택하세요');
      const 토스트보임 = await 알림.문구('옵션을 선택하세요').first().isVisible();
      const 줄수 = (await 장바구니조회(page.request)).length;
      await verify('사이즈를 고르지 않아도 토스트 「옵션을 선택하세요」가 보이고 장바구니가 비어 있다', `토스트 ${토스트보임 ? '보임' : '안 보임'} · 장바구니 ${줄수}줄`, '토스트 보임 · 장바구니 0줄');
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
