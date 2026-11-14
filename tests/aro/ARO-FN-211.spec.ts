import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정, 시험사유 } from './helpers/sanction.helper.js';
import { 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-211',
  name: 'qa_player2 상세 패널을 연 채 정지를 걸면 표의 상태 칩과 상세 패널의 제재 이력이 새로 고쳐진다',
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

    await test.step('대상 계정의 상세 패널을 열어 확인한다', async () => {
      await 화면.상세열기(계정);
      await verify('상세 패널이 열려 있다', await 화면.상세패널.isVisible(), true, { blocker: true });
      await verify('대상 계정 줄에 「정지」 버튼이 보인다', await 화면.줄버튼(시험계정, '정지').isVisible(), true, { blocker: true });
    });

    await test.step('qa_player2 상세 패널을 연 채 표에서 정지를 건다', async () => {
      const 사유 = 시험사유('ARO-FN-211');
      await 화면.제재걸기(시험계정, '정지', 사유);
      const 이력떴다 = await 화면.제재행(사유).waitFor({ timeout: 10_000 }).then(() => true, () => false);
      const 표 = await verify('표의 상태 칩이 「정지」다', (await 화면.상태칩들(시험계정).allInnerTexts()).join(', '), '정지');
      const 이력 = await verify('상세 패널의 제재 이력에 방금 건 정지가 보인다', 이력떴다, true);
      await verify('qa_player2 상세 패널을 연 채 정지를 걸면 표의 상태 칩과 상세 패널의 제재 이력이 새로 고쳐진다', 표 && 이력, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
