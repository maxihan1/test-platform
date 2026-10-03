import { defineCase, test, verify } from '@platform/kit';

import { 교육콘텐츠화면 } from './pages/content.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-011',
  name: '교육 콘텐츠 알아보기 화면에 제목, 구역 제목, 소개 영상이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 콘텐츠 = new 교육콘텐츠화면(page);

  await test.step('교육 콘텐츠 알아보기 화면을 연다', async () => {
    await 콘텐츠.열기();

    const 제목보임 = await 콘텐츠.제목
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육 콘텐츠 알아보기 화면에 제목 「교육 콘텐츠 알아보기」가 보인다', 제목보임, true);

    const 도메인보임 = await 콘텐츠.구역제목('7대 도메인 분야')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육 콘텐츠 알아보기 화면에 「7대 도메인 분야」 구역 제목이 보인다', 도메인보임, true);

    const 도구보임 = await 콘텐츠.구역제목('AI·SW 도구 학습')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육 콘텐츠 알아보기 화면에 「AI·SW 도구 학습」 구역 제목이 보인다', 도구보임, true);

    const 심화보임 = await 콘텐츠.구역제목('AI·SW 심화 학습')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육 콘텐츠 알아보기 화면에 「AI·SW 심화 학습」 구역 제목이 보인다', 심화보임, true);

    const 응용보임 = await 콘텐츠.구역제목('AI·SW 응용 학습')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육 콘텐츠 알아보기 화면에 「AI·SW 응용 학습」 구역 제목이 보인다', 응용보임, true);

    const 영상보임 = await 콘텐츠.소개영상플레이어
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('교육 콘텐츠 알아보기 화면에 소개 영상 플레이어가 보인다', 영상보임, true);
  });
});
