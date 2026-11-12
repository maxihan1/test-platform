import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-037',
  name: '계정 목록 도구 줄에 전체 선택 체크박스와 「허가」 · 「거부」 · 「정지」가 차례로 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '승인 대기 계정(newbie_wait)이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);

  await test.step('Owner 계정으로 로그인하고 승인 대기 계정을 확인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.대기목록열기();
    await verify('승인 대기 계정(newbie_wait)이 있다', await 목록.행('newbie_wait').isVisible(), true, { blocker: true });
  });

  await test.step('「계정」 화면을 연다', async () => {
    await 목록.열기();
    const 전체 = await verify('전체 선택 체크박스가 보인다', await 목록.전체선택.isVisible(), true);
    const 버튼 = await verify('도구 줄에 「허가」 · 「거부」 · 「정지」가 차례로 보인다', (await 목록.도구줄버튼들.allInnerTexts()).map((글) => 글.trim()).join(', '), '허가, 거부, 정지');
    await verify('계정 목록 도구 줄에 전체 선택 체크박스와 「허가」 · 「거부」 · 「정지」가 차례로 보인다', 전체 && 버튼, true);
  });
});
