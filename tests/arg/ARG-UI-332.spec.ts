import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 친구창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-332',
  name: '친구 · 파티 창에 제목 「친구 · 파티」, 안내 글 「캐릭터 이름」, 「친구 신청」 · 「파티 초대」, 「친구 <수>명」, 「닫기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('친구 · 파티 창 제목').default('친구 · 파티'),
    안내: z.string().describe('이름 칸 안내 글').default('캐릭터 이름'),
    친구신청: z.string().describe('친구 신청 버튼 글자').default('친구 신청'),
    파티초대: z.string().describe('파티 초대 버튼 글자').default('파티 초대'),
    닫기: z.string().describe('닫기 버튼 글자').default('닫기'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('친구 · 파티 창을 연다', async () => {
    const 창 = await 친구창.열기(game);
    await 창.줄뜨는지('친구 ');
    const 제목 = await verify('친구 · 파티 창 제목이 「친구 · 파티」로 보인다', await 창.제목글(), expected.제목);
    const 안내 = await verify('이름 칸 안내 글 「캐릭터 이름」이 보인다', await 창.안내글(), expected.안내);
    const 친구신청 = await verify('「친구 신청」 버튼이 보인다', await 창.친구신청글(), expected.친구신청);
    const 파티초대 = await verify('「파티 초대」 버튼이 보인다', await 창.파티초대글(), expected.파티초대);
    const 줄들 = await 창.목록글들();
    const 친구수 = await verify('「친구 <수>명」 줄이 보인다', 줄들.some((줄) => /^친구 \d+명$/.test(줄)), true);
    const 닫기 = await verify('「닫기」 버튼이 보인다', await 창.닫기글(), expected.닫기);
    await verify(
      '친구 · 파티 창에 제목 「친구 · 파티」, 안내 글 「캐릭터 이름」, 「친구 신청」 · 「파티 초대」, 「친구 <수>명」, 「닫기」가 보인다',
      제목 && 안내 && 친구신청 && 파티초대 && 친구수 && 닫기,
      true,
    );
  });
});
