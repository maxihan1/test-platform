import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방개수, 알림글읽기, 우편지급하고창열기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기, 실패걸기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-256',
  name: '우편 저장이 실패하면 오류 알림 「우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요」가 뜬다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있고 우편함을 기준 상태로 비워 두었다'],
  techniques: ['동등 분할'],
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

  const 제목 = '[QA] 저장 실패 우편';
  await test.step('체력 물약 1개를 단 우편을 지급하고 우편 저장 요청 한 번이 실패하게 건 뒤 「받기」를 누른다', async () => {
    const 전 = await 가방개수(game, '체력 물약');
    const { 창 } = await 우편지급하고창열기(game, admin, 아이디, [{ 제목, 아이템: [{ itemName: '체력 물약', quantity: 1 }] }], 1);
    const 번호 = await 창.줄찾기(제목);
    await verify('우편함 창에 지급한 우편 줄이 보인다', 번호 >= 0, true, { blocker: true });
    await 실패걸기(admin, '/api/savemailmessage');
    await 창.받기누르기(번호);
    const 알림 = await 알림글읽기(game, '우편을 받지 못했습니다', 10_000);
    await verify('우편 저장이 실패하면 오류 알림 「우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요」가 뜬다', (알림 ?? '').includes('우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요'), true);
    await 창.닫기();
    await verify('우편 저장이 실패할 때 가방의 체력 물약 수가 그대로다', await 가방개수(game, '체력 물약'), 전);
  });
});
