import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정, 시험사유 } from './helpers/sanction.helper.js';
import { 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-229',
  name: '채팅 금지 창에 사유를 적고 「채팅 금지」를 누르면 확인 창 없이 토스트 「qa_player2 채팅 금지 처리했습니다」가 뜬다',
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
      await verify('대상 계정 줄에 「채팅 금지」 버튼이 보인다', await 화면.줄버튼(시험계정, '채팅 금지').isVisible(), true, { blocker: true });
    });

    await test.step('채팅 금지 창에 사유를 적고 「채팅 금지」를 누른다', async () => {
      await 화면.제재창열기(시험계정, '채팅 금지');
      await 화면.제재사유칸.fill(시험사유('ARO-FN-229'));
      await 화면.창.누르기('채팅 금지');
      const 떴다 = await 화면.알림.뜰때까지(`${시험계정} 채팅 금지 처리했습니다`);
      await verify('채팅 금지 창에 사유를 적고 「채팅 금지」를 누르면 확인 창 없이 토스트 「qa_player2 채팅 금지 처리했습니다」가 뜬다', 떴다, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
