import { defineCase, test, verify } from '@platform/kit';

import { 지원혜택화면 } from './pages/benefits.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-013',
  name: '지원혜택 화면에 제목, 소제목, 혜택 카드, 영상 이동 버튼이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 지원혜택 = new 지원혜택화면(page);

  await test.step('지원혜택 화면을 연다', async () => {
    await 지원혜택.열기();

    const 제목보임 = await 지원혜택.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('지원혜택 화면에 제목 「지원혜택」이 보인다', 제목보임, true);

    const 소제목보임 = await 지원혜택.소제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('지원혜택 화면에 「누구에게나 열려 있는 기회」 소제목이 보인다', 소제목보임, true);

    await 지원혜택.혜택카드.last().waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    const 카드수 = await 지원혜택.혜택카드.count();
    await verify('지원혜택 화면에 혜택 카드가 열두 개 보인다', 카드수, 12);

    const 이전보임 = await 지원혜택.이전영상버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('지원혜택 화면에 「이전 영상」 버튼이 보인다', 이전보임, true);

    const 다음보임 = await 지원혜택.다음영상버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('지원혜택 화면에 「다음 영상」 버튼이 보인다', 다음보임, true);
  });
});
