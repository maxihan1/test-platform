import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정, 시험사유 } from './helpers/sanction.helper.js';
import { 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-181',
  name: 'qa_player2 에 정지와 채팅 금지를 둘 다 걸면 「정지」와 「채팅 금지」 칩이 나란히 보인다',
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
      await verify('대상 계정 줄에 상태 칩 「정상」이 보인다', (await 화면.상태칩들(시험계정).allInnerTexts()).join(', '), '정상', { blocker: true });
    });

    await test.step('qa_player2 에 정지와 채팅 금지를 둘 다 건다', async () => {
      await 화면.제재걸기(시험계정, '정지', 시험사유('ARO-FN-181'));
      await 화면.줄버튼(시험계정, '정지 해제').waitFor({ timeout: 10_000 });
      await 화면.제재걸기(시험계정, '채팅 금지', 시험사유('ARO-FN-181'));
      const 버튼떴다 = await 화면.줄버튼(시험계정, '채팅 금지 해제').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('「채팅 금지 해제」 버튼이 보인다', 버튼떴다, true);
      await verify('qa_player2 에 정지와 채팅 금지를 둘 다 걸면 「정지」와 「채팅 금지」 칩이 나란히 보인다', (await 화면.상태칩들(시험계정).allInnerTexts()).join(', '), '정지, 채팅 금지');
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
