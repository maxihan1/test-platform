import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-070',
  name: '「추천 상품 다음」을 누르면 추천 상품 줄이 옆으로 넘어간다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '공지 팝업 · 설문은 이미 닫았다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 안내창끄기(page);
    await 홈.열기();
    await verify('비회원이다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('공지 팝업 · 설문은 이미 닫았다', [await 홈.공지팝업.count(), await 홈.설문.count()], [0, 0], { blocker: true });
  });

  await test.step('추천 상품의 「추천 상품 다음」 버튼을 누른다', async () => {
    const 누르기전 = await 홈.추천첫칸위치();
    await 홈.추천다음버튼.click();
    await verify('「추천 상품 다음」을 누르면 추천 상품 줄이 옆으로 넘어간다', (await 홈.추천줄이멈출때까지기다리기()) < 누르기전, true);
  });

  await test.step('추천 상품 카드에 마우스를 올린다', async () => {
    await 홈.추천카드들.first().hover();
    await verify('상품 설명 한 줄이 말풍선으로 보인다', [await 홈.추천말풍선.count(), (await 홈.추천말풍선.innerText()).trim().length > 0], [1, true]);
  });

  await test.step('홈 화면을 다시 연다', async () => {
    const 처음순서 = await 홈.추천순서();
    await 홈.열기();
    await verify('다시 들어오면 추천 상품 순서가 바뀐다', (await 홈.추천순서()).join(' · ') !== 처음순서.join(' · '), true);
  });
});
