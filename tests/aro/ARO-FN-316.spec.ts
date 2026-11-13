import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-316',
  name: 'qa_player2 에 정지를 걸면 제재 이력 「상태」에 「적용 중」 칩이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  const 사유 = 시험사유('ARO-FN-316');
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정의 제재를 풀어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
    });

    await test.step('대상 계정의 상세 패널을 열어 확인한다', async () => {
      await 화면.상세열기(계정);
      await verify('상세 패널이 열려 있다', await 화면.상세패널.isVisible(), true, { blocker: true });
    });

    await test.step('qa_player2 에 정지를 걸고 상세 패널을 연다', async () => {
      await 새제재걸기(page, 계정, 'SUSPEND', 사유);
      await 화면.상세열기(계정);
      await verify('qa_player2 에 정지를 걸면 제재 이력 「상태」에 「적용 중」 칩이 보인다', (await 화면.제재상태칩(사유).allInnerTexts()).join(', '), '적용 중');
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
