import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-108',
  name: '경고 프리셋이 있을 때 조치 화면을 열면 「경고 틀 사용하기」 선택 목록에 「제목 - 본문 앞부분」 꼴 항목이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '경고 프리셋이 1개 이상 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 조치 = new 조치화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
  });

  await test.step('qa_user2 의 조치 취하기 화면을 연다', async () => {
    await 조치.열기(await 계정번호(page, 'qa_user2'));
    await verify('경고 프리셋이 1개 이상 있다', await 조치.경고틀.isVisible(), true, { blocker: true });
    await verify('경고 프리셋이 있을 때 조치 화면을 열면 「경고 틀 사용하기」 선택 목록에 「제목 - 본문 앞부분」 꼴 항목이 보인다', (await 조치.경고틀항목글()).filter((글) => /^.+ - .+/.test(글)).length >= 1, true);
  });
});
