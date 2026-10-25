import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-023',
  name: '79px 내리면 머리글이 화면 위에 붙지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    belowPx: z.number().describe('내릴 거리(px) — 0 이상 80 미만').default(79),
    edgePx: z.number().describe('내릴 거리(px) — 80 이상 화면 끝까지').default(80),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
  });

  await test.step('홈 화면을 79px 내린다', async () => {
    await 홈.아래로내리기(params.belowPx);
    await verify('79px 내리면 머리글이 화면 위에 붙지 않는다', await 홈.머리글붙음(), false);
  });

  await test.step('79px 내린 머리글 높이를 확인한다', async () => {
    await verify('79px 내렸을 때 머리글 높이가 64px 이다', await 홈.머리글높이(), 64);
  });

  await test.step('홈 화면을 80px 내린다', async () => {
    await 홈.아래로내리기(params.edgePx);
    await verify('80px 내리면 머리글이 화면 위에 붙는다', await 홈.머리글붙음(), true);
  });

  await test.step('80px 내린 머리글 높이를 확인한다', async () => {
    await verify('80px 내렸을 때 머리글 높이가 48px 이다', await 홈.머리글높이(), 48);
  });
});
