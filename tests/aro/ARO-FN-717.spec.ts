import { defineCase, test, verify } from '@platform/kit';


export const spec = defineCase({
  tcId: 'ARO-FN-717',
  name: '쿠키 없이 /api/ops/summary 를 부르면 401 UNAUTHORIZED 와 「운영자 로그인이 필요합니다」가 온다',
  techniques: ['동등 분할'],
  precondition: ['로그인하지 않았다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('쿠키 없이 /api/ops/summary 를 부른다', async () => {
    const 응답 = await request.get('/api/ops/summary');
    const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
    const 코드 = await verify('응답 코드가 401 이다', 응답.status(), 401);
    const 종류 = await verify('본문의 code 가 「UNAUTHORIZED」다', 몸.code, 'UNAUTHORIZED');
    const 문구 = await verify('본문의 message 가 「운영자 로그인이 필요합니다」다', 몸.message, '운영자 로그인이 필요합니다');
    await verify('쿠키 없이 /api/ops/summary 를 부르면 401 UNAUTHORIZED 와 「운영자 로그인이 필요합니다」가 온다', 코드 && 종류 && 문구, true);
  });
});
