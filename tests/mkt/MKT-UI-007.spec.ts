import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-007',
  name: '홈 화면에 배너 점 3개와 화살표 · 인기글 · 최신글 탭 · 카운트다운이 보인다',
  precondition: ['홈에 처음 들어온 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await new 머리글(page).장바구니링크().waitFor();
    await 홈.배너점(1).waitFor();
    await verify(
      '배너 3장에 맞춰 점 3개가 보인다',
      [await 홈.배너장들().count(), await 홈.배너점들().filter({ visible: true }).count()],
      [3, 3],
      { blocker: true },
    );
    await verify(
      '배너 좌우에 「이전」 「다음」 화살표가 보인다',
      [await 홈.이전화살표().isVisible(), await 홈.다음화살표().isVisible()],
      [true, true],
    );
    await verify('현재 장의 점은 색이 채워져 있다', (await 홈.현재배너점배경색()) !== 'rgba(0, 0, 0, 0)', true);
    await verify(
      '배너 아래에 「인기글」 「최신글」 탭이 보인다',
      [
        await 홈.인기글탭().isVisible(),
        await 홈.최신글탭().isVisible(),
        await 홈.위아래로놓여있는가(홈.배너(), 홈.인기글탭()),
      ],
      [true, true, true],
    );
    await verify('「인기글」 탭이 기본으로 선택돼 있다', await 홈.선택된탭('인기글').isVisible(), true);
    await verify(
      '탭 위에 「타임세일 종료까지 HH:MM:SS」 꼴의 카운트다운이 보인다',
      [
        /^타임세일 종료까지 \d{2}:\d{2}:\d{2}$/.test(await 홈.카운트다운().innerText()),
        await 홈.위아래로놓여있는가(홈.카운트다운(), 홈.인기글탭()),
      ],
      [true, true],
    );
  });
});
