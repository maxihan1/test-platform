import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-084',
  name: '정지가 걸린 qa_player2 줄의 「정지 해제」를 누르면 확인 창 없이 「정지 해제」 사유 창이 열린다',
  precondition: ['qa_player2 에 정지가 걸려 있다'],
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
    await test.step('운영자 계정으로 로그인하고 대상 계정에 정지를 걸어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
      await 새제재걸기(page, 계정, 'SUSPEND', 시험사유('ARO-UI-084'));
    });

    await test.step('「유저 · 제재」에서 정지가 걸린 대상 계정 줄을 확인한다', async () => {
      await 화면.열기(`?q=${시험계정}`);
      await verify('대상 계정 줄에 「정지 해제」 버튼이 보인다', await 화면.줄버튼(시험계정, '정지 해제').isVisible(), true, { blocker: true });
    });

    await test.step('유저 표에서 qa_player2 의 「정지 해제」를 누른다', async () => {
      await 화면.줄버튼(시험계정, '정지 해제').click();
      const 열렸다 = await 화면.창.열릴때까지();
      const 제목 = 열렸다 ? await 화면.창.제목.innerText() : '';
      await verify('정지가 걸린 qa_player2 줄의 「정지 해제」를 누르면 확인 창 없이 「정지 해제」 사유 창이 열린다', 제목.trim(), '정지 해제');
    });

    await test.step('사유 창의 칸과 버튼을 본다', async () => {
      const 칸 = await verify('「해제 사유 (1~200자)」 칸이 보인다', await 화면.해제사유칸.isVisible(), true);
      const 닫기 = await verify('「닫기」 버튼이 보인다', await 화면.창.버튼('닫기').isVisible(), true);
      const 확인 = await verify('「확인」 버튼이 보인다', await 화면.창.버튼('확인').isVisible(), true);
      await verify('사유 창에 「해제 사유 (1~200자)」 칸과 「닫기」 · 「확인」 버튼이 보인다', 칸 && 닫기 && 확인, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});
