import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-003',
  name: '제목과 본문과 작성자를 넣어 글을 등록하면 등록된 내용이 그대로 돌아온다',
  precondition: ['글 등록 데모 API에 접근할 수 있다'],
  params: z.object({
    userId: z.number().describe('작성자 번호').default(7),
    title: z.string().min(1).describe('글 제목').default('테스트 자동화 플랫폼'),
    body: z.string().min(1).describe('글 본문').default('명세가 곧 테스트다'),
  }),
  expected: z.object({
    statusCode: z.number().describe('응답 코드').default(201),
    echoesInput: z.boolean().describe('등록한 내용이 그대로 돌아오는지').default(true),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let created: { userId?: number; title?: string; body?: string } = {};

  await test.step('글을 등록한다', async () => {
    const res = await request.post('https://jsonplaceholder.typicode.com/posts', { data: params });
    await verify('응답 코드가 기대와 같다', res.status(), expected.statusCode, { blocker: true });
    created = await res.json();
  });

  await test.step('등록된 내용을 확인한다', async () => {
    const same = created.userId === params.userId && created.title === params.title && created.body === params.body;
    await verify('등록한 작성자와 제목과 본문이 그대로 돌아온다', same, expected.echoesInput);
  });
});
