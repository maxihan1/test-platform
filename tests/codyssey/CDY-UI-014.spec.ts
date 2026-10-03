import { defineCase, test, verify } from '@platform/kit';

import { 교육콘텐츠체험화면 } from './pages/demo.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-014',
  name: '교육 콘텐츠 체험 화면에 체험 틀, 「닫기」 버튼, 시작 버튼이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 체험 = new 교육콘텐츠체험화면(page);

  await test.step('교육 콘텐츠 체험 화면을 연다', async () => {
    await 체험.열기();

    const 틀보임 = await 체험.체험틀
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육 콘텐츠 체험 화면에 체험 틀이 보인다', 틀보임, true);

    const 닫기보임 = await 체험.닫기버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육 콘텐츠 체험 화면에 「닫기」 버튼이 보인다', 닫기보임, true);

    const 시작보임 = await 체험.체험시작버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('체험 틀 안에 「체험 시작하기 →」 버튼이 보인다', 시작보임, true);
  });
});
