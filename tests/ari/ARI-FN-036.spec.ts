import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'ARI-FN-036',
  name: 'POST /api/login 에 필드 이름을 소문자로 보내면 200 이다',
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
  await test.step('POST /api/login 에 필드 이름을 소문자 username · password 로 보낸다', async () => {
    const 응답 = await request.post('/api/login', { data: { username: params.playerId ?? '', password: params.playerPassword ?? '' } });
    await verify('POST /api/login 에 필드 이름을 소문자로 보내면 200 이다', 응답.status(), expected.응답코드);
  });
});
