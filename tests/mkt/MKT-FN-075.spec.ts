import { defineCase, test, verify } from '@platform/kit';

import { 상품상세화면 } from './pages/shop-detail.page.js';

type 상품요약 = { id: number; soldOut: boolean };
type 상품상세 = { id: number; reviewCount: number; qna: { question: string; answer: string }[] };

export const spec = defineCase({
  tcId: 'MKT-FN-075',
  name: '탭을 누르면 주소는 그대로 내용만 바뀌고 「상품 문의」의 질문은 여러 개를 동시에 펼칠 수 있다',
  precondition: ['비회원이다', '문의가 둘 이상인 상품이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  let 대상: 상품상세 | undefined;
  for (const 상품 of 목록.filter((항목) => !항목.soldOut)) {
    const 자세히 = (await (await page.request.get(`/api/products/${상품.id}`)).json()) as 상품상세;
    if (자세히.qna.length >= 2) {
      대상 = 자세히;
      break;
    }
  }
  const 문의상품 = 대상 as 상품상세;
  const 첫째 = 문의상품.qna[0] ?? { question: '', answer: '' };
  const 둘째 = 문의상품.qna[1] ?? { question: '', answer: '' };

  await test.step('「리뷰」 탭과 「상품 문의」 탭을 차례로 누른다', async () => {
    await 상세.열기(문의상품.id);
    await 상세.상품명().waitFor();
    await verify('문의가 둘 이상인 상품이다', 문의상품.qna.length >= 2, true, { blocker: true });
    const 처음주소 = page.url();
    await 상세.탭(/^리뷰/).click();
    await 상세.선택된탭(`리뷰 (${문의상품.reviewCount})`).waitFor();
    const 리뷰탭주소 = page.url();
    await 상세.탭('상품 문의').click();
    await 상세.질문버튼(첫째.question).waitFor();
    await verify(
      '탭을 누르면 내용만 바뀌고 주소는 바뀌지 않는다',
      [리뷰탭주소 === 처음주소, page.url() === 처음주소, await 상세.선택된탭('상품 문의').isVisible()],
      [true, true, true],
    );
  });

  await test.step('「상품 문의」 탭의 질문을 누른다', async () => {
    await 상세.질문버튼(첫째.question).click();
    await 상세.펼쳐진질문버튼(첫째.question).waitFor();
    const 펼친뒤 = await 상세.답변(첫째.answer).isVisible();
    await 상세.질문버튼(첫째.question).click();
    await 상세.접힌질문버튼(첫째.question).waitFor();
    await verify(
      '질문을 누르면 그 아래에 답변이 펼쳐지고 다시 누르면 접힌다',
      [펼친뒤, await 상세.답변(첫째.answer).isVisible()],
      [true, false],
    );
  });

  await test.step('「상품 문의」 탭의 질문 둘을 차례로 누른다', async () => {
    await 상세.질문버튼(첫째.question).click();
    await 상세.질문버튼(둘째.question).click();
    await 상세.펼쳐진질문버튼(둘째.question).waitFor();
    await verify(
      '여러 질문을 동시에 펼칠 수 있다',
      [await 상세.답변(첫째.answer).isVisible(), await 상세.답변(둘째.answer).isVisible()],
      [true, true],
    );
  });
});
