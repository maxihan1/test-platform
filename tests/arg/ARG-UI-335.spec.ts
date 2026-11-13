import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-335',
  name: '채팅 창에 제목 「채팅」, 「전체」 · 「파티」 · 「길드」 탭, 안내 글 「메시지 입력 (100자)」, 「보내기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('채팅 창 제목').default('채팅'),
    전체탭: z.string().describe('전체 탭 글자').default('전체'),
    파티탭: z.string().describe('파티 탭 글자').default('파티'),
    길드탭: z.string().describe('길드 탭 글자').default('길드'),
    안내: z.string().describe('입력 칸 안내 글').default('메시지 입력 (100자)'),
    보내기: z.string().describe('보내기 버튼 글자').default('보내기'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('채팅 창을 연다', async () => {
    const 창 = await 채팅창.열기(game);
    const 제목 = await verify('채팅 창 제목이 「채팅」으로 보인다', await 창.제목글(), expected.제목);
    const 전체 = await verify('채팅 창에 「전체」 탭이 보인다', await 창.탭글('전체'), expected.전체탭);
    const 파티 = await verify('채팅 창에 「파티」 탭이 보인다', await 창.탭글('파티'), expected.파티탭);
    const 길드 = await verify('채팅 창에 「길드」 탭이 보인다', await 창.탭글('길드'), expected.길드탭);
    const 안내 = await verify('입력 칸 안내 글 「메시지 입력 (100자)」가 보인다', await 창.입력안내글(), expected.안내);
    const 보내기 = await verify('채팅 창에 「보내기」 버튼이 보인다', await 창.보내기글(), expected.보내기);
    await verify(
      '채팅 창에 제목 「채팅」, 「전체」 · 「파티」 · 「길드」 탭, 안내 글 「메시지 입력 (100자)」, 「보내기」가 보인다',
      제목 && 전체 && 파티 && 길드 && 안내 && 보내기,
      true,
    );
  });
});
