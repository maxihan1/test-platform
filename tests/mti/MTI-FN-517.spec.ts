import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-517',
  name: 'OAuth 서버 메타데이터를 부르면 scopes_supported 에 read · write · follow · profile · push · admin:read · admin:write 가 모두 있다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    필요한범위: z.string().describe('있어야 하는 범위들(공백으로 나눔)').default('read write follow profile push admin:read admin:write'),
    빠진범위: z.string().describe('없는 범위들').default(''),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /.well-known/oauth-authorization-server 로 범위 목록을 읽는다', async () => {
    const 응답 = await request.get('/.well-known/oauth-authorization-server');
    const 몸 = (await 응답.json()) as { scopes_supported?: string[] };
    const 지원 = 몸.scopes_supported ?? [];
    const 빠진 = expected.필요한범위.split(' ').filter((범위) => !지원.includes(범위));
    await verify('OAuth 서버 메타데이터를 부르면 scopes_supported 에 read · write · follow · profile · push · admin:read · admin:write 가 모두 있다', 빠진.join(' '), expected.빠진범위);
  });
});
