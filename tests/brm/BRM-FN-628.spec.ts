import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 봇들켜기, 봇이받음 } from './helpers/social-tools.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇기록, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-628',
  name: '길드장이 아닌 길드원이 초대하면 「길드장만 초대할 수 있습니다」 오류가 온다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장인 길드에 두 번째 플레이어 봇이 길드원으로 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 봇3 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
    await 계정되돌리기(admin, 봇3);
  });
  await test.step('길드를 만든 일반 회원의 길드에 두 번째 플레이어 봇이 길드원으로 들어가고 세 번째 플레이어 봇이 접속한다', async () => {
    await verify('일반 회원이 길드장인 길드에 두 번째 플레이어 봇이 길드원으로 있다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa628', 들어옴: [봇] }), true, { blocker: true });
    await 봇들켜기(admin, [봇3]);
  });
  await test.step('봇에게 세 번째 플레이어 길드 초대를 시킨다', async () => {
    await 봇기록(admin, 봇.아이디, true);
    await 봇시키기(admin, 봇.아이디, `guild_invite:${봇3.아이디}`);
    await verify('길드장이 아닌 길드원이 초대하면 「길드장만 초대할 수 있습니다」 오류가 온다', await 봇이받음(admin, 봇.아이디, 'toast', '길드장만 초대할 수 있습니다'), true);
  });
});
