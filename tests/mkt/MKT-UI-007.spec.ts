import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-007',
  name: '홈 화면에 배너 · 글 탭 · 추천 상품 · 타임세일 카운트다운이 제 위치에 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.공지팝업을치운다();
    await 홈.쿠키띠를치운다();
    await 홈.설문을치운다();
    await 홈.열기();
    await 홈.배너점(3).waitFor();
    await 홈.추천카드.first().waitFor();
    await 홈.글제목들.first().waitFor();
    await 홈.카운트다운.filter({ hasNotText: '--:--:--' }).waitFor();
    const 배너 = await 홈.배너영역.boundingBox();
    const 인기탭 = await 홈.인기글탭.boundingBox();
    const 최신탭 = await 홈.최신글탭.boundingBox();
    const 카운트 = await 홈.카운트다운.boundingBox();
    const 이전 = await 홈.배너이전.boundingBox();
    const 다음 = await 홈.배너다음.boundingBox();
    const 배너가운데 = (배너?.x ?? 0) + (배너?.width ?? 0) / 2;
    await verify('홈 위쪽에 배너 영역이 보인다', (await 홈.배너영역.isVisible()) && (배너?.y ?? 9999) < (인기탭?.y ?? 0), true);
    await verify(
      '배너 좌우에 「이전」 · 「다음」 화살표가 보인다',
      (await 홈.배너이전.isVisible()) && (await 홈.배너다음.isVisible()) && (이전?.x ?? 9999) < 배너가운데 && (다음?.x ?? 0) > 배너가운데,
      true,
    );
    const 점들 = await 홈.배너점들.all();
    const 점상자 = await Promise.all(점들.map((점) => 점.boundingBox()));
    await verify(
      '배너 아래에 현재 장을 나타내는 점 3개가 보인다',
      점들.length === 3 && 점상자.every((상자) => (상자?.y ?? 0) > (배너?.y ?? 0) + (배너?.height ?? 0) / 2),
      true,
    );
    const 채움 = await 홈.배너현재점.evaluate((요소) => getComputedStyle(요소).backgroundColor);
    await verify('현재 장의 점은 색이 채워져 있다', 채움 !== 'rgba(0, 0, 0, 0)', true);
    await verify(
      '배너 아래에 「인기글」 · 「최신글」 탭이 보인다',
      (await 홈.인기글탭.isVisible()) && (await 홈.최신글탭.isVisible()) && (인기탭?.y ?? 0) >= (배너?.y ?? 0) + (배너?.height ?? 0) && (최신탭?.y ?? 0) >= (배너?.y ?? 0) + (배너?.height ?? 0),
      true,
    );
    await verify('「인기글」 탭이 기본으로 선택돼 있다', await 홈.인기글탭.getAttribute('aria-selected'), 'true');
    const 카드상자 = await Promise.all((await 홈.추천카드.all()).map((카드) => 카드.boundingBox()));
    await verify(
      '탭 아래에 「추천 상품」 8개가 가로 한 줄로 보인다',
      카드상자.length === 8 && 카드상자.every((상자) => Math.round(상자?.y ?? -1) === Math.round(카드상자[0]?.y ?? -2) && (상자?.y ?? 0) > (인기탭?.y ?? 0)),
      true,
    );
    await verify(
      '탭 위에 「타임세일 종료까지 HH:MM:SS」 카운트다운이 보인다',
      /^타임세일 종료까지 \d{2}:\d{2}:\d{2}$/.test(await 홈.카운트다운.innerText()) && (카운트?.y ?? 9999) < (인기탭?.y ?? 0),
      true,
    );
  });
});
