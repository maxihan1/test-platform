import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정 } from './helpers/sanction.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-072',
  name: '유저 표에서 qa_player2 의 「정지」를 누르면 「qa_player2 정지」 창이 열린다',
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

  await test.step('유저 표에서 qa_player2 의 「정지」를 누른다', async () => {
    await 화면.줄버튼(시험계정, '정지').click();
    const 열렸다 = await 화면.창.열릴때까지();
    const 제목 = 열렸다 ? await 화면.창.제목.innerText() : '';
    await verify('유저 표에서 qa_player2 의 「정지」를 누르면 「qa_player2 정지」 창이 열린다', 제목.trim(), `${시험계정} 정지`);
  });

  await test.step('정지 창의 칸과 버튼을 본다', async () => {
    const 기간 = await verify('「기간」 칸이 보인다', await 화면.기간칸.isVisible(), true);
    const 사유 = await verify('「사유 (1~200자, 유저에게 보일 수 있음)」 칸이 보인다', await 화면.제재사유칸.isVisible(), true);
    const 닫기 = await verify('「닫기」 버튼이 보인다', await 화면.창.버튼('닫기').isVisible(), true);
    const 정지 = await verify('「정지」 버튼이 보인다', await 화면.창.버튼('정지').isVisible(), true);
    await verify('정지 창에 「기간」 · 「사유 (1~200자, 유저에게 보일 수 있음)」 칸과 「닫기」 · 「정지」 버튼이 보인다', 기간 && 사유 && 닫기 && 정지, true);
  });

  await test.step('정지 창의 안내를 본다', async () => {
    await verify('정지 창에 안내 「정지 중에는 게임 로그인이 막힙니다(비밀번호가 맞으면 정지 안내가 나감).」가 보인다', await 화면.창안내('정지 중에는 게임 로그인이 막힙니다(비밀번호가 맞으면 정지 안내가 나감).').isVisible(), true);
  });
});
