import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정 } from './helpers/sanction.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-074',
  name: '정지 창 「기간」 드롭다운에 「1시간」 · 「1일」 · 「3일」 · 「7일」 · 「30일」 · 「해제할 때까지」가 보이고 「1일」이 처음 선택돼 있다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);

  await test.step('운영자 계정으로 로그인하고 대상 계정의 제재를 풀어 둔다', async () => {
    await 대상준비(page, params.loginId, params.loginPassword);
  });

  await test.step('「유저 · 제재」에서 대상 계정 줄을 확인한다', async () => {
    await 화면.열기(`?q=${시험계정}`);
    await verify('대상 계정 줄에 「정지」 버튼이 보인다', await 화면.줄버튼(시험계정, '정지').isVisible(), true, { blocker: true });
  });

  await test.step('유저 표에서 qa_player2 의 「정지」를 눌러 정지 창을 연다', async () => {
    await 화면.제재창열기(시험계정, '정지');
  });

  await test.step('정지 창을 확인한다', async () => {
    await verify('정지 창에 「기간」 칸이 보인다', await 화면.기간칸.isVisible(), true, { blocker: true });
  });

  await test.step('정지 창의 「기간」 드롭다운을 본다', async () => {
    const 선택지 = await verify('드롭다운에 「1시간」 · 「1일」 · 「3일」 · 「7일」 · 「30일」 · 「해제할 때까지」가 차례로 보인다', (await 화면.기간선택지.allInnerTexts()).map((x) => x.trim()).join(', '), '1시간, 1일, 3일, 7일, 30일, 해제할 때까지');
    const 처음값 = await verify('처음 선택된 것이 「1일」이다', await 화면.선택된기간(), '1일');
    await verify('정지 창 「기간」 드롭다운에 「1시간」 · 「1일」 · 「3일」 · 「7일」 · 「30일」 · 「해제할 때까지」가 보이고 「1일」이 처음 선택돼 있다', 선택지 && 처음값, true);
  });
});
