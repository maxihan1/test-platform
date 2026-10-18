import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 응답붙잡기, 전체상품 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-222',
  name: '입력이 바뀌면 자동완성 목록에 마지막 입력 「니트」에 맞는 결과만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['앞 검색어의 자동완성 응답을 늦춰 두었다'],
  params: z.object({
    firstWord: z.string().describe('먼저 적는 검색어 — 상품 이름 일부').default('데모'),
    lastWord: z.string().describe('바꿔 적는 검색어 — 먼저 적은 것과 다른 상품 이름 일부').default('니트'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);
  const 맞는 = (글: string) => (주소: URL) => 주소.pathname === '/api/products/suggest' && 주소.searchParams.get('q') === 글;
  const 기대 = (await 전체상품(page.request)).map((상품) => 상품.name).filter((이름) => 이름.includes(params.lastWord)).slice(0, 5);

  const 붙잡음 = await 응답붙잡기(page, 맞는(params.firstWord));
  try {
    await test.step('앞 검색어의 자동완성 응답을 늦춰 두고 상품 목록 화면을 연다', async () => {
      await 방해창막기(page);
      await 목록.열기();
      await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    });

    await test.step('검색칸에 「데모」를 적었다가 「니트」로 바꾼다', async () => {
      await 목록.검색어적기(params.firstWord);
      await 붙잡음.도착했을때까지;
      await 목록.검색어적기(params.lastWord);
      await 목록.자동완성항목.first().waitFor();
      const 늦은응답 = page.waitForResponse((응답) => 맞는(params.firstWord)(new URL(응답.url())));
      붙잡음.풀기();
      await 늦은응답;
      await 두프레임뒤(page);
      await verify('입력이 바뀌면 자동완성 목록에 마지막 입력 「니트」에 맞는 결과만 보인다', (await 목록.자동완성항목.allInnerTexts()).join(', '), 기대.join(', '));
    });
  } finally {
    await 붙잡음.거두기();
  }
});
