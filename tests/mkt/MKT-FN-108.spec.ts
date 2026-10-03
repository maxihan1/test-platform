import { defineCase, test, verify } from '@platform/kit';

import { 상품목록화면 } from './pages/shop-list.page.js';

type 상품요약 = { name: string };

export const spec = defineCase({
  tcId: 'MKT-FN-108',
  name: '자동완성 입력을 바꾸면 먼저 적은 글자의 늦은 응답이 와도 마지막 입력에 맞는 결과만 보인다',
  precondition: ['비회원이다', '먼저 적은 글자의 자동완성 응답이 늦게 온다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 전체 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 소설상품 = 전체.filter((상품) => 상품.name.includes('소설')).map((상품) => 상품.name);
  let 옛응답보내기: () => void = () => undefined;
  const 옛응답대기 = new Promise<void>((다음) => {
    옛응답보내기 = 다음;
  });
  let 옛요청도착: () => void = () => undefined;
  const 옛요청도착대기 = new Promise<void>((다음) => {
    옛요청도착 = 다음;
  });
  const 먼저적은글자 = (주소: string): boolean => {
    const 해석 = new URL(주소);
    return 해석.pathname === '/api/products/suggest' && 해석.searchParams.get('q') === '니트';
  };
  await page.context().route('**/api/products/suggest?**', async (route) => {
    if (먼저적은글자(route.request().url())) {
      옛요청도착();
      await 옛응답대기;
    }
    await route.continue();
  });

  try {
    await test.step('검색칸의 글자를 「소설」로 바꾸고 0.3초 멈춘다', async () => {
      await 목록.열기();
      await 목록.제목().waitFor();
      await 목록.검색어적기('니트');
      await 옛요청도착대기;
      await verify('먼저 적은 글자의 자동완성 응답이 늦게 온다', await 목록.자동완성목록().isVisible(), false, { blocker: true });
      const 옛응답 = page.waitForResponse((응답) => 먼저적은글자(응답.url()));
      await 목록.검색어적기('소설');
      await 목록.자동완성항목(소설상품[0] as string).waitFor();
      옛응답보내기();
      await 옛응답;
      await page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
      await verify('자동완성 입력을 바꾸면 먼저 적은 글자의 늦은 응답이 와도 마지막 입력에 맞는 결과만 보인다', await 목록.자동완성항목들().allInnerTexts(), 소설상품);
    });
  } finally {
    옛응답보내기();
    await page.context().unrouteAll({ behavior: 'wait' });
  }
});
