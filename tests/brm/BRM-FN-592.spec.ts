import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 지금화면, 던전으로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-592',
  name: '플레이어 이동 속도 값을 읽으면 던전에 들어온 탱커의 이동 속도는 5 다',
  platforms: ['android'],
  held: '보류 — 이동 속도를 읽을 게임 속성 주소를 모름',
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['class:탱커', 'state:장소=던전'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    플레이어주소: z.string().describe('탱커 오브젝트 주소 — 이동 속도 값이 든 오브젝트'),
    이동속도칸: z.string().describe('이동 속도 속성 — 「컴포넌트.칸」 꼴'),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('플레이어 이동 속도 값을 읽는다', async () => {
    const 속도 = Number(await game.get(params.플레이어주소, params.이동속도칸));
    await verify('플레이어 이동 속도 값을 읽으면 던전에 들어온 탱커의 이동 속도는 5 다', 속도, 5);
  });
});
