import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정 } from './helpers/sanction.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-073',
  name: '유저 표에서 qa_player2 의 「채팅 금지」를 누르면 「qa_player2 채팅 금지」 창이 열린다',
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
    await verify('대상 계정 줄에 「채팅 금지」 버튼이 보인다', await 화면.줄버튼(시험계정, '채팅 금지').isVisible(), true, { blocker: true });
  });

  await test.step('유저 표에서 qa_player2 의 「채팅 금지」를 누른다', async () => {
    await 화면.줄버튼(시험계정, '채팅 금지').click();
    const 열렸다 = await 화면.창.열릴때까지();
    const 제목 = 열렸다 ? await 화면.창.제목.innerText() : '';
    await verify('유저 표에서 qa_player2 의 「채팅 금지」를 누르면 「qa_player2 채팅 금지」 창이 열린다', 제목.trim(), `${시험계정} 채팅 금지`);
  });

  await test.step('채팅 금지 창의 안내와 버튼을 본다', async () => {
    const 안내 = await verify('안내 「채팅 금지는 게임 서버가 읽어 채팅을 막습니다.」가 보인다', await 화면.창안내('채팅 금지는 게임 서버가 읽어 채팅을 막습니다.').isVisible(), true);
    const 버튼 = await verify('「채팅 금지」 버튼이 보인다', await 화면.창.버튼('채팅 금지').isVisible(), true);
    await verify('채팅 금지 창에 안내 「채팅 금지는 게임 서버가 읽어 채팅을 막습니다.」와 「채팅 금지」 버튼이 보인다', 안내 && 버튼, true);
  });
});
