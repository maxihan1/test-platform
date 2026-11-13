import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-262',
  name: '채팅 금지 해제 사유를 적고 「확인」을 누르면 토스트 「채팅 금지를 해제했습니다」가 뜬다',
  precondition: ['qa_player2 에 채팅 금지가 걸려 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    해제사유: z.string().min(1).max(200).describe('해제 사유 — 1~200자').default('[QA] ARO-FN-262 해제'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정에 채팅 금지를 걸어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
      await 새제재걸기(page, 계정, 'CHAT_MUTE', 시험사유('ARO-FN-262'));
    });

    await test.step('「유저 · 제재」에서 채팅 금지가 걸린 대상 계정 줄을 확인한다', async () => {
      await 화면.열기(`?q=${시험계정}`);
      await verify('대상 계정 줄에 「채팅 금지 해제」 버튼이 보인다', await 화면.줄버튼(시험계정, '채팅 금지 해제').isVisible(), true, { blocker: true });
    });

    await test.step('유저 표에서 qa_player2 의 「채팅 금지 해제」를 눌러 사유 창을 연다', async () => {
      await 화면.제재창열기(시험계정, '채팅 금지 해제');
    });

    await test.step('「채팅 금지 해제」 사유 창을 확인한다', async () => {
      await verify('사유 창 제목이 「채팅 금지 해제」이다', await 화면.창.제목.innerText(), '채팅 금지 해제', { blocker: true });
    });

    await test.step('「채팅 금지 해제」 사유 창에 사유를 적고 「확인」을 누른다', async () => {
      await 화면.해제사유칸.fill(params.해제사유);
      await 화면.창.누르기('확인');
      const 떴다 = await 화면.알림.뜰때까지('채팅 금지를 해제했습니다');
      await verify('채팅 금지 해제 사유를 적고 「확인」을 누르면 토스트 「채팅 금지를 해제했습니다」가 뜬다', 떴다, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
