import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 전체상품읽기, 첫응답만늦추기 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-076',
  name: '검색칸 글자를 빠르게 바꾸면 마지막 입력에 맞는 자동완성만 보인다',
  platforms: ['desktop'],
  precondition: ['자동완성 첫 응답은 늦춘 응답이다', '비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 상품목록화면(page);
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 전체 = await 전체상품읽기(request);
  const 늦춤 = await 첫응답만늦추기(page.context(), /\/api\/products\/suggest/);

  try {
    await test.step('상품 목록 화면을 연다', async () => {
      await 방해막기(page);
      await 목록.열기();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await verify('상품 검색칸이 보인다', await 목록.검색칸.isVisible(), true, { blocker: true });
    });

    await test.step('검색칸 글자를 빠르게 바꿔 적는다', async () => {
      const 첫응답 = page.waitForResponse((r) => r.url().includes('/api/products/suggest'));
      const 첫요청 = page.waitForRequest((r) => r.url().includes('/api/products/suggest'));
      await 목록.검색어적기('키');
      await 첫요청;
      await 목록.검색어적기('허브');
      await 목록.자동완성항목.filter({ hasText: '허브' }).first().waitFor();
      늦춤.놓기();
      await 첫응답;
      await page.waitForTimeout(500);
      await verify(
        '검색칸 글자를 빠르게 바꾸면 마지막 입력에 맞는 자동완성만 보인다',
        await 목록.자동완성항목.allInnerTexts(),
        전체.filter((p) => p.name.includes('허브')).map((p) => p.name),
      );
    });

    await test.step('자동완성 항목 하나를 누른다', async () => {
      await 목록.검색어적기('키');
      await 목록.자동완성항목.first().waitFor();
      const 이름 = (await 목록.자동완성항목.first().innerText()).trim();
      await 목록.자동완성항목.first().click();
      await 상세.큰이미지버튼.waitFor();
      await verify('자동완성 항목을 누르면 그 상품 상세로 간다', await 상세.상품명.innerText(), 이름);
    });

    await test.step('자동완성이 열린 채 ESC 를 친다', async () => {
      await 목록.열기();
      await 목록.검색어적기('키');
      await 목록.자동완성목록.waitFor();
      await page.keyboard.press('Escape');
      await verify('자동완성이 열린 채 ESC 를 치면 목록이 닫힌다', await 목록.자동완성목록.isVisible(), false);
    });
  } finally {
    await 늦춤.풀기();
  }
});
