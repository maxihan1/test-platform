import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 오른쪽위버튼 } from './components/corner.component.js';
import { 나가기창닫기, 설정창닫기 } from './helpers/place.helper.js';
import { 뜨는지 } from './helpers/find.helper.js';
import { 로그인화면까지, 로비까지 } from './helpers/login.helper.js';

export const spec = defineCase({
  tcId: 'ARG-UI-354',
  name: '오른쪽 위 버튼 반응',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    나가기글: z.string().describe('나가기 창 안내 글').default('Return to Menu?'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('로그인 화면에서 톱니바퀴를 누른다', async () => {
    const 화면 = await 로그인화면까지(game);
    try {
      await 화면.구석.톱니바퀴누르기();
      await verify('로그인 화면에서 톱니바퀴를 누르면 설정 창이 열린다', await 뜨는지(game, 오른쪽위버튼.설정창), true);
    } finally {
      await 설정창닫기(game);
    }
  });

  await test.step('로그인해 로비에서 「X」를 누른다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    try {
      await 대기실.구석.X누르기();
      const 떴다 = await 뜨는지(game, 오른쪽위버튼.나가기창);
      const 글 = 떴다 ? await 대기실.구석.나가기창글() : '';
      await verify('로비에서 「X」를 누르면 「Return to Menu?」 창이 뜬다', 떴다 && 글.includes(expected.나가기글), true);
    } finally {
      await 나가기창닫기(game);
    }
  });
});
