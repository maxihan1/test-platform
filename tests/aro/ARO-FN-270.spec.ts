import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-270',
  name: '해제 사유에 공백만 적고 「확인」을 누르면 토스트 「해제 사유를 1~200자로 입력하세요」가 뜬다',
  precondition: ['qa_player2 에 정지가 걸려 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    공백사유: z.string().min(1).describe('해제 사유로 적을 글 — 공백 문자만으로 된 글').default('   '),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정에 정지를 걸어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
      await 새제재걸기(page, 계정, 'SUSPEND', 시험사유('ARO-FN-270'));
    });

    await test.step('「유저 · 제재」에서 정지가 걸린 대상 계정 줄을 확인한다', async () => {
      await 화면.열기(`?q=${시험계정}`);
      await verify('대상 계정 줄에 「정지 해제」 버튼이 보인다', await 화면.줄버튼(시험계정, '정지 해제').isVisible(), true, { blocker: true });
    });

    await test.step('해제 사유에 공백만 적고 「확인」을 누른다', async () => {
      await 화면.제재창열기(시험계정, '정지 해제');
      await 화면.해제사유칸.fill(params.공백사유);
      await 화면.창.누르기('확인');
      const 떴다 = await 화면.알림.뜰때까지('해제 사유를 1~200자로 입력하세요');
      await verify('해제 사유에 공백만 적고 「확인」을 누르면 토스트 「해제 사유를 1~200자로 입력하세요」가 뜬다', 떴다, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
