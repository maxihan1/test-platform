import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-319',
  name: '가방 창에 제목 「가방」, 「장착 중」의 「무기」 · 「갑옷」 · 「장신구」 칸, 「닫기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('가방 창 제목').default('가방'),
    장착중: z.string().describe('장착 구역 이름').default('장착 중'),
    칸들: z.string().describe('장착 칸 이름 차례').default('무기 · 갑옷 · 장신구'),
    닫기: z.string().describe('닫기 버튼 글자').default('닫기'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('가방 창을 연다', async () => {
    const 가방 = await 가방창.열기(game);
    const 제목 = await verify('가방 창 제목이 「가방」이다', await 가방.제목글(), expected.제목);
    const 장착중 = await verify('가방 창에 「장착 중」이 보인다', await 가방.장착중글(), expected.장착중);
    const 칸들 = await verify(
      '「장착 중」에 「무기」 · 「갑옷」 · 「장신구」 칸이 이 차례로 보인다',
      [await 가방.칸라벨('무기'), await 가방.칸라벨('갑옷'), await 가방.칸라벨('장신구')].join(' · '),
      expected.칸들,
    );
    const 닫기 = await verify('가방 창에 「닫기」가 보인다', await 가방.닫기글(), expected.닫기);
    await verify('가방 창에 제목 「가방」, 「장착 중」의 「무기」 · 「갑옷」 · 「장신구」 칸, 「닫기」가 보인다', 제목 && 장착중 && 칸들 && 닫기, true);
  });
});
