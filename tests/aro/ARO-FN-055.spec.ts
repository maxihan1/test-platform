import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정 } from './helpers/sanction.helper.js';
import { 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-055',
  name: '사유 없이 정지 창의 「정지」를 누르면 창이 먼저 닫히고 토스트로 「사유를 1~200자로 입력하세요」가 뜬다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정의 제재를 풀어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
    });

    await test.step('「유저 · 제재」에서 대상 계정 줄을 확인한다', async () => {
      await 화면.열기(`?q=${시험계정}`);
      await verify('대상 계정 줄에 「정지」 버튼이 보인다', await 화면.줄버튼(시험계정, '정지').isVisible(), true, { blocker: true });
    });

    await test.step('qa_player2 의 정지 창에 사유를 비우고 「정지」를 누른다', async () => {
      await 화면.제재창열기(시험계정, '정지');
      await 화면.창.누르기('정지');
      const 떴다 = await 화면.알림.뜰때까지('사유를 1~200자로 입력하세요');
      const 닫혔다 = await 화면.창.닫힐때까지();
      const 창 = await verify('정지 창이 닫힌다', 닫혔다, true);
      const 토스트 = await verify('토스트 「사유를 1~200자로 입력하세요」가 뜬다', 떴다, true);
      await verify('사유 없이 정지 창의 「정지」를 누르면 창이 먼저 닫히고 토스트로 「사유를 1~200자로 입력하세요」가 뜬다', 창 && 토스트, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
