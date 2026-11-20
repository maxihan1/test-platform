import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 채팅띠에글뜰때까지, 채팅띠줄들 } from './helpers/login-tools.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-514',
  name: '채팅 세 줄을 보내면 채팅 띠에 최근 2줄이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  const 글들 = ['qa514 첫째', 'qa514 둘째', 'qa514 셋째'];
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('채팅 세 줄을 보내고 채팅 띠를 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    let 올라온수 = 0;
    for (const 글 of 글들) {
      await 창.보내기(글);
      if (await 창.글줄뜸(글)) 올라온수 += 1;
    }
    await verify('보낸 채팅 세 줄이 채팅 창에 올라온다', 올라온수, 3, { blocker: true });
    await 창.닫기();
    await 채팅띠에글뜰때까지(game, '셋째');
    const 줄들 = await 채팅띠줄들(game);
    const 줄수 = await verify('채팅 띠가 2줄이다', 줄들.length, 2);
    const 앞줄 = await verify('채팅 띠 첫째 줄이 둘째로 보낸 글이다', (줄들[0] ?? '').includes('qa514 둘째'), true);
    const 뒷줄 = await verify('채팅 띠 둘째 줄이 셋째로 보낸 글이다', (줄들[1] ?? '').includes('qa514 셋째'), true);
    await verify('채팅 세 줄을 보내면 채팅 띠에 최근 2줄이 보인다', 줄수 && 앞줄 && 뒷줄, true);
  });
});
