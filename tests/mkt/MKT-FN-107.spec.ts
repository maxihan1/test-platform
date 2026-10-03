import { defineCase, test, verify } from '@platform/kit';

import { 상품목록화면 } from './pages/shop-list.page.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

type 상품요약 = { id: number; name: string };

export const spec = defineCase({
  tcId: 'MKT-FN-107',
  name: '검색칸에 글자를 적고 0.3초 멈추면 자동완성 목록이 펼쳐지고 항목을 누르면 그 상품 상세로 간다',
  precondition: ['비회원이다', '이름에 「트」가 든 상품이 6개 이상이다', '자동완성 목록이 펼쳐져 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 상세 = new 상품상세화면(page);
  const 전체 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 맞는상품 = 전체.filter((상품) => 상품.name.includes('트'));

  await test.step('검색칸에 「트」를 적고 0.3초 멈춘다', async () => {
    await 목록.열기();
    await 목록.제목().waitFor();
    await verify('이름에 「트」가 든 상품이 6개 이상이다', 맞는상품.length >= 6, true, { blocker: true });
    await 목록.검색어적기('트');
    await 목록.자동완성항목들().first().waitFor();
    await verify(
      '검색칸에 글자를 적고 0.3초 멈추면 자동완성 목록이 검색칸 아래에 펼쳐진다',
      [await 목록.자동완성목록().isVisible(), await 목록.자동완성이검색칸아래에있는가()],
      [true, true],
    );
    await verify('일치하는 상품이 6개 이상이어도 자동완성 목록에는 5개까지만 보인다', await 목록.자동완성항목들().count(), 5);
  });

  await test.step('자동완성 항목을 누른다', async () => {
    await verify('자동완성 목록이 펼쳐져 있다', await 목록.자동완성목록().isVisible(), true, { blocker: true });
    const 이름 = await 목록.자동완성항목들().first().innerText();
    const 상품 = 맞는상품.find((항목) => 항목.name === 이름) as 상품요약;
    await 목록.자동완성항목(이름).click();
    await page.waitForURL(`**/shop/${String(상품.id)}`);
    await 상세.상품명().waitFor();
    await verify(
      '자동완성 항목을 누르면 그 상품 상세 화면으로 간다',
      [new URL(page.url()).pathname, await 상세.상품명().innerText()],
      [`/shop/${String(상품.id)}`, 이름],
    );
  });
});
