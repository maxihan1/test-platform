import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편지급하고창열기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-535',
  name: '체력 물약 1개를 단 우편을 지급하고 우편함 창을 열면 같은 아이템이 1개인 첨부는 이름 뒤에 「x」 개수가 붙지 않는다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있고 우편함을 기준 상태로 비워 두었다'],
  techniques: ['경계값 분석'],
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

  await test.step('체력 물약 1개를 단 우편을 지급하고 우편함 창을 연다', async () => {
    const 제목 = '[QA] 물약 하나 우편';
    const { 창 } = await 우편지급하고창열기(game, admin, 아이디, [{ 제목, 아이템: [{ itemName: '체력 물약', quantity: 1 }] }], 1);
    const 번호 = await 창.줄찾기(제목);
    await verify('우편함 창에 지급한 우편 줄이 보인다', 번호 >= 0, true, { blocker: true });
    const 첨부 = await 창.첨부글(번호);
    await verify('첨부에 「체력 물약」이 보인다', 첨부.includes('체력 물약'), true, { blocker: true });
    await verify('체력 물약 1개를 단 우편을 지급하고 우편함 창을 열면 같은 아이템이 1개인 첨부는 이름 뒤에 「x」 개수가 붙지 않는다', /체력 물약\s*x\d/.test(첨부), false);
    await 창.닫기();
  });

  await test.step('체력 물약 2개를 단 우편을 지급하고 우편함 창을 연다', async () => {
    const 제목 = '[QA] 물약 둘 우편';
    const { 창 } = await 우편지급하고창열기(game, admin, 아이디, [{ 제목, 아이템: [{ itemName: '체력 물약', quantity: 2 }] }], 2);
    const 번호 = await 창.줄찾기(제목);
    await verify('우편함 창에 지급한 우편 줄이 보인다', 번호 >= 0, true, { blocker: true });
    await verify('같은 아이템이 2개인 첨부는 이름 뒤에 「x2」가 붙는다', (await 창.첨부글(번호)).includes('체력 물약 x2'), true);
  });
});
