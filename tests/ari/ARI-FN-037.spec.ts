import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'ARI-FN-037',
  name: '대문자 경로 /API/LOGIN 으로 로그인을 부르면 200 이다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('대문자 경로 /API/LOGIN 으로 로그인 요청을 보낸다', async () => {
    const 응답 = await request.post('/API/LOGIN', { data: { UserName: params.playerId ?? '', Password: params.playerPassword ?? '' } });
    await verify('대문자 경로 /API/LOGIN 으로 로그인을 부르면 200 이다', 응답.status(), expected.응답코드);
  });
});
