import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-109',
  name: '제재 이력 「종류」에 정지는 「정지」, 채팅 금지는 「채팅 금지」 칩으로 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  const 정지사유 = 시험사유('ARO-UI-109 정지');
  const 채팅사유 = 시험사유('ARO-UI-109 채팅');
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정에 정지와 채팅 금지를 걸어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
      await 새제재걸기(page, 계정, 'SUSPEND', 정지사유);
      await 새제재걸기(page, 계정, 'CHAT_MUTE', 채팅사유);
    });

    await test.step('상세 패널의 제재 이력에서 걸어 둔 제재를 확인한다', async () => {
      await 화면.상세열기(계정);
      await verify('걸어 둔 정지 줄이 제재 이력에 보인다', await 화면.제재행(정지사유).count(), 1, { blocker: true });
      await verify('걸어 둔 채팅 금지 줄이 제재 이력에 보인다', await 화면.제재행(채팅사유).count(), 1, { blocker: true });
    });

    await test.step('qa_player2 상세 패널의 제재 이력 「종류」 칸을 본다', async () => {
      const 정지 = await verify('정지의 「종류」 칩이 「정지」다', (await 화면.제재종류칩(정지사유).allInnerTexts()).join(', '), '정지');
      const 채팅 = await verify('채팅 금지의 「종류」 칩이 「채팅 금지」다', (await 화면.제재종류칩(채팅사유).allInnerTexts()).join(', '), '채팅 금지');
      await verify('제재 이력 「종류」에 정지는 「정지」, 채팅 금지는 「채팅 금지」 칩으로 보인다', 정지 && 채팅, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
