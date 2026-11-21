import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버개수가될때까지, 서버골드가될때까지, 알림글읽기, 우편보내고우편함열기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 실패걸기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-262',
  name: '우편 저장이 실패하면 「우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림이 뜨고 가방과 골드가 그대로다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어에게 첨부 있는 우편이 와 있고 다음 우편 저장 요청 하나가 실패하도록 걸려 있다'],
  techniques: ['동등 분할'],
  elements: ['item:체력 물약', 'flow:골드-우편'],
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
  await test.step('두 번째 플레이어에게 첨부 있는 우편이 와 있다', async () => {
    await 로비로(game, driver, 둘째);
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 262', 아이템: [{ 이름: '체력 물약', 개수: 1 }], 골드: 10 }]);
    await verify('우편 줄에 「받기」 버튼이 있다', await 함.받기버튼있나(0), true, { blocker: true });
  });
  await test.step('다음 우편 저장 요청 하나가 실패하도록 걸어 둔다', async () => {
    await 실패걸기(admin, '/api/savemailmessage', 1);
    const 함 = await 우편함창.열기(game);
    await verify('실패를 건 뒤에도 우편 줄에 「받기」 버튼이 있다', await 함.받기버튼있나(0), true, { blocker: true });
  });
  await test.step('우편함 창에서 「받기」를 누른다', async () => {
    const 함 = await 우편함창.열기(game);
    await 함.받기(0);
    const 알림 = await verify('「우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림이 뜬다', await 알림글읽기(game, '우편을 받지 못했습니다'), '우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요');
    const 골드 = await verify('운영툴 캐릭터 골드가 200 그대로다', await 서버골드가될때까지(admin, 둘째, 200), 200);
    const 가방 = await verify('운영툴 캐릭터 아이템에서 체력 물약이 3개 그대로다', await 서버개수가될때까지(admin, 둘째, '체력 물약', 3), 3);
    await verify('우편 저장이 실패하면 「우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림이 뜨고 가방과 골드가 그대로다', 알림 && 골드 && 가방, true);
  });
});
