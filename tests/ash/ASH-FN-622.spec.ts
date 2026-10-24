import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 새캐릭터, 될때까지, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 로그인창 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-622',
  name: 'GM 콘솔로 순간이동하면 서버에 저장된 위치가 옮긴 자리다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 GM 콘솔을 열었다'],
  elements: ['zone:Boss'],
  held: '보류 — 게임 창을 못 엶(GM 콘솔)',
  params: z.object({
    아이디칸: z.string().describe('아이디 입력칸 오브젝트 주소 — 게임 화면에서 읽는다'),
    비밀번호칸: z.string().describe('비밀번호 입력칸 오브젝트 주소 — 게임 화면에서 읽는다'),
    캐릭터선택단추: z.string().describe('캐릭터 고르기 단추 오브젝트 주소 — 게임 화면에서 읽는다'),
    월드입장단추: z.string().describe('월드 입장 단추 오브젝트 주소 — 게임 화면에서 읽는다'),
    콘솔열기단추: z.string().describe('GM 콘솔 여는 단추 오브젝트 주소 — 게임 화면에서 읽는다'),
    명령입력칸: z.string().describe('GM 콘솔 명령 입력칸 오브젝트 주소 — 게임 화면에서 읽는다'),
    순간이동명령: z.string().describe('보스 지역으로 순간이동하는 GM 명령 — GM 콘솔 안내에서 읽는다'),
    명령보내기단추: z.string().describe('GM 콘솔 명령 보내기 단추 오브젝트 주소 — 게임 화면에서 읽는다'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터로 월드에 들어가 GM 콘솔을 연다', async () => {
      나 = await 새캐릭터(admin, 'zqa622');
      await 로그인창.열기(game);
      await game.type(params.아이디칸, 나.아이디);
      await game.type(params.비밀번호칸, 나.비밀번호);
      await game.click(로그인창.로그인버튼);
      await game.click(params.캐릭터선택단추);
      await game.click(params.월드입장단추);
      await game.click(params.콘솔열기단추);
    });

    await test.step('GM 콘솔의 명령 입력칸이 보이는지 확인한다', async () => {
      await game.waitFor(params.명령입력칸);
      await verify('GM 콘솔의 명령 입력칸이 보인다', (await game.find(params.명령입력칸)) !== null, true, { blocker: true });
    });

    await test.step('GM 콘솔로 보스 지역으로 순간이동한다', async () => {
      await game.type(params.명령입력칸, params.순간이동명령);
      await game.click(params.명령보내기단추);
      await 될때까지(async () => ((await 캐릭터읽기(admin, 나!)).zone === 'Town' ? undefined : true), 15_000);
      await verify('GM 콘솔로 순간이동하면 서버에 저장된 위치가 옮긴 자리다', (await 캐릭터읽기(admin, 나!)).zone, 'Boss');
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
