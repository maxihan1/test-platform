import { defineCase, test, verify } from '@platform/kit';

import { 교육콘텐츠화면 } from './pages/content.page.js';
import { 교육콘텐츠체험화면 } from './pages/demo.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-024',
  name: '교육 콘텐츠 체험 화면에서 「닫기」를 누르면 「교육 콘텐츠 알아보기」 화면 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['교육 콘텐츠 체험 화면이 열려 있다', '비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 체험 = new 교육콘텐츠체험화면(page);
  const 콘텐츠 = new 교육콘텐츠화면(page);

  await test.step('교육 콘텐츠 체험 화면을 연다', async () => {
    await 체험.열기();
  });

  await test.step('교육 콘텐츠 체험 화면의 「닫기」 버튼을 확인한다', async () => {
    const 닫기보임 = await 체험.닫기버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육 콘텐츠 체험 화면에 「닫기」 버튼이 보인다', 닫기보임, true, { blocker: true });
  });

  await test.step('「닫기」를 누른다', async () => {
    await 체험.닫기버튼.click();

    const 제목보임 = await 콘텐츠.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육 콘텐츠 체험 화면에서 「닫기」를 누르면 「교육 콘텐츠 알아보기」 화면 제목이 보인다', 제목보임, true);
  });
});
