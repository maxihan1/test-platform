import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편지급하고창열기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-592',
  name: '운영툴이 지급한 아이템을 받으면 가방의 그 아이템 번호가 운영툴이 붙인 번호와 같다',
  platforms: ['windows'],
  held: '보류 — 운영 API 지급 기록 · 아이템 흐름 기록에 아이템 번호 칸이 없어 운영툴이 붙인 번호를 읽을 수 없다',
  precondition: ['두 번째 플레이어로 로그인해 로비에 있고 우편함을 기준 상태로 비워 두었다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    가방아이템번호: z.string().describe('가방에서 읽은 「사슬 갑옷」 아이템 번호'),
    운영툴아이템번호: z.string().describe('운영툴이 붙인 「사슬 갑옷」 아이템 번호'),
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

  await test.step('사슬 갑옷 1개를 단 우편을 지급하고 「받기」를 누른다', async () => {
    const 제목 = '[QA] 아이템 번호 우편';
    const { 창 } = await 우편지급하고창열기(game, admin, 아이디, [{ 제목, 아이템: [{ itemName: '사슬 갑옷', quantity: 1 }] }], 1);
    const 번호 = await 창.줄찾기(제목);
    await verify('우편함 창에 지급한 우편 줄이 보인다', 번호 >= 0, true, { blocker: true });
    await 창.받기누르기(번호);
    await verify('받은 우편 줄이 「첨부 없음」으로 바뀐다', await 창.첨부없음이될때까지(번호), true, { blocker: true });
    await verify('운영툴이 지급한 아이템을 받으면 가방의 그 아이템 번호가 운영툴이 붙인 번호와 같다', params.가방아이템번호, params.운영툴아이템번호);
  });
});
