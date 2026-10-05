import { defineCase, test, verify } from '@platform/kit';

import { 상품번호 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-289',
  name: '5초마다 「{N}명이 보고 있어요」의 숫자가 다시 정해져 바뀐다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 본숫자들: Array<number | null> = [];

  await test.step('상품 상세를 연다', async () => {
    await page.clock.install();
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 상세.열기(상품번호.니트가디건);
    await 상세.보고있어요.waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    본숫자들.push(await 상세.본숫자());
  });

  await test.step('상품 상세에서 5초씩 네 번 기다린다', async () => {
    for (let 번 = 0; 번 < 4; 번 += 1) {
      await page.clock.runFor(5000);
      본숫자들.push(await 상세.본숫자());
    }
    const 모두범위안 = 본숫자들.every((수) => 수 !== null && 수 >= 3 && 수 <= 30);
    const 서로다른값 = new Set(본숫자들).size;
    await verify(
      '5초마다 「{N}명이 보고 있어요」의 숫자가 다시 정해져 바뀐다',
      `${모두범위안 ? '숫자는 모두 3~30 사이' : '범위 밖 숫자가 있다'} · ${서로다른값 > 1 ? '숫자가 바뀐다' : '숫자가 그대로다'}`,
      '숫자는 모두 3~30 사이 · 숫자가 바뀐다',
    );
  });
});
