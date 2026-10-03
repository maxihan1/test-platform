import { defineCase, test, verify } from '@platform/kit';

import { 로그아웃홈 } from './pages/landing.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-003',
  name: '로그아웃 상태 홈에 버튼 하나와 머리글 링크 둘이 모두 보인다',
  platforms: ['desktop'],
  precondition: ['로그아웃 상태다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 홈 = new 로그아웃홈(page);

  await test.step('로그아웃 상태 홈을 연다', async () => {
    await 홈.열기();

    const 신청버튼보임 = await 홈.교육과정신청버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('로그아웃 상태 홈에 「교육과정 신청하기」 버튼이 보인다', 신청버튼보임, true);

    const 회원가입링크보임 = await 홈.머리글회원가입링크
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('로그아웃 상태 홈 머리글에 「회원가입」 링크가 보인다', 회원가입링크보임, true);

    const 로그인링크보임 = await 홈.머리글로그인링크
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('로그아웃 상태 홈 머리글에 「로그인」 링크가 보인다', 로그인링크보임, true);
  });
});
