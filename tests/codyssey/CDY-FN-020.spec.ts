import { defineCase, test, verify } from '@platform/kit';

import { 캠퍼스화면 } from './pages/campus.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-020',
  name: '캠퍼스 지도에서 경남 점을 누르면 「Codyssey 경남」 카드가 선택된다',
  platforms: ['desktop'],
  precondition: [
    '캠퍼스 안내 화면이 열려 있다',
    '비회원이다',
    '「Codyssey 경남」 카드가 선택되어 있지 않다',
  ],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 캠퍼스 = new 캠퍼스화면(page);

  await test.step('캠퍼스 안내 화면을 연다', async () => {
    await 캠퍼스.열기();
  });

  await test.step('「Codyssey 경남」 카드의 선택 상태를 확인한다', async () => {
    await 캠퍼스.경남카드.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    const 선택됨 = await 캠퍼스.경남카드선택됨();
    await verify('「Codyssey 경남」 카드가 선택되어 있지 않다', 선택됨, false, { blocker: true });
  });

  await test.step('캠퍼스 지도에서 경남 점을 누른다', async () => {
    await 캠퍼스.경남점.click();
    await 캠퍼스.서울카드선택풀림기다리기();

    const 선택됨 = await 캠퍼스.경남카드선택됨();
    await verify('캠퍼스 지도에서 경남 점을 누르면 「Codyssey 경남」 카드가 선택된다', 선택됨, true);
  });
});
