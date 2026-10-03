import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-018',
  name: '이벤트 띠가 배너와 탭 사이에 끼어 들어와 아래 내용을 밀어내고 X 를 누르면 닫힌다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 열고 이벤트 띠가 들어올 때까지 기다린다', async () => {
    await 홈.공지팝업을치운다();
    await 홈.쿠키띠를치운다();
    await 홈.설문을치운다();
    await 홈.열기();
    await 홈.인기글탭.waitFor();
    const 탭전 = await 홈.인기글탭.boundingBox();
    await 홈.이벤트띠.waitFor();
    const 띠 = await 홈.이벤트띠.boundingBox();
    const 배너 = await 홈.배너영역.boundingBox();
    const 탭후 = await 홈.인기글탭.boundingBox();
    await verify(
      '이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 배너와 탭 사이에 끼어 들어간다',
      (await 홈.이벤트띠.getByText('🎉 가을 맞이 전 상품 무료 배송').isVisible()) &&
        (띠?.y ?? 0) >= (배너?.y ?? 0) + (배너?.height ?? 0) &&
        (띠?.y ?? 9999) < (탭후?.y ?? 0),
      true,
    );
    await verify('이벤트 띠가 들어오면 그 아래 내용이 아래로 밀려난다', (탭후?.y ?? 0) > (탭전?.y ?? 0), true);
  });

  await test.step('이벤트 띠의 X 를 누른다', async () => {
    await 홈.이벤트띠닫기.click();
    await verify('이벤트 띠의 X 를 누르면 띠가 닫힌다', await 홈.이벤트띠.isVisible(), false);
  });
});
