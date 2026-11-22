import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편지급하고창열기, 우편함로그인, 지급회수시도 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-276',
  name: '운영 API 로 그 지급을 회수하고 가방 창을 열면 이미 받은 첨부를 운영툴이 회수해도 가방의 「사슬 갑옷」이 그대로 있다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어가 사슬 갑옷 우편을 받아 가방에 넣었다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  await test.cleanup('두 번째 플레이어를 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 상태 = await 우편함로그인(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('메뉴 우편 버튼에 숫자가 없다', 상태.비었음, true, { blocker: true });
  });

  const 제목 = '[QA] 회수될 갑옷 우편';
  let 지급번호 = 0;
  await test.step('사슬 갑옷 우편을 받아 가방에 넣은 것을 확인한다', async () => {
    const { 창, 번호 } = await 우편지급하고창열기(game, admin, 아이디, [{ 제목, 아이템: [{ itemName: '사슬 갑옷', quantity: 1 }] }], 1);
    지급번호 = 번호[0] ?? 0;
    await 창.받기누르기(await 창.줄찾기(제목));
    await verify('받은 우편 줄이 「첨부 없음」으로 바뀐다', await 창.첨부없음이될때까지(0), true, { blocker: true });
    await 창.닫기();
    const 가방 = await 가방창.열기(game);
    await verify('가방 창에 「사슬 갑옷」 줄이 보인다', await 가방.줄이생길때까지('사슬 갑옷'), true, { blocker: true });
    await 가방.닫기();
  });

  await test.step('운영 API 로 그 지급을 회수하고 가방 창을 연다', async () => {
    await 지급회수시도(admin, 지급번호);
    const 가방 = await 가방창.열기(game);
    await verify('운영 API 로 그 지급을 회수하고 가방 창을 열면 이미 받은 첨부를 운영툴이 회수해도 가방의 「사슬 갑옷」이 그대로 있다', await 가방.줄이생길때까지('사슬 갑옷'), true);
  });
});
