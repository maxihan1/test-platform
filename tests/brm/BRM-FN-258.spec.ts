import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림글읽기, 우편숫자될때까지, 우편함줄뜰때까지 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 기록없는첨부우편, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-258',
  name: '기록에 없는 아이템만 첨부된 우편의 「받기」를 누르면 「첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어에게 기록에 없는 첨부만 단 우편이 와 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 둘째);
  });
  await test.step('두 번째 플레이어에게 기록에 없는 첨부만 단 우편이 와 있다', async () => {
    await 로비로(game, driver, 둘째);
    await 기록없는첨부우편(admin, 둘째, 'QA 우편 258');
    await 우편숫자될때까지(game, 1);
    await 우편함창.열기(game);
    await verify('우편 줄이 하나 뜬다', await 우편함줄뜰때까지(game, 1), true, { blocker: true });
  });
  await test.step('우편함 창에서 그 우편의 「받기」를 누른다', async () => {
    const 함 = await 우편함창.열기(game);
    await 함.받기(0);
    await verify('기록에 없는 아이템만 첨부된 우편의 「받기」를 누르면 「첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림이 뜬다', await 알림글읽기(game, '첨부 정보를 읽지 못했습니다'), '첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요');
  });
});
