import { defineCase, test, verify } from '@platform/kit';

interface 서버상태 {
  status?: string;
}

export const spec = defineCase({
  tcId: 'DMN-FN-124',
  name: '서버가 정상일 때 서버 상태를 부르면 status 가 UP 이다',
  apiDoc: 1,
  smoke: true,
  precondition: ['서버가 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('서버 상태를 부른다', async () => {
    const res = await request.get('/v1/health');
    const 본문 = (await res.json()) as 서버상태;
    await verify('서버가 정상일 때 서버 상태를 부르면 status 가 UP 이다', 본문.status, 'UP');
  });
});
