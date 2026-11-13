import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-503',
  name: 'page 0 으로 GET /opsapi/users 를 부르면 page 1 과 같은 목록이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: z.object({
    영쪽: z.number().int().describe('쪽 번호 — 0 이하 정수').default(0),
    음수쪽: z.number().int().describe('쪽 번호 — 0 이하 정수').default(-1),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, params, expected }) => {
  const 목록 = async (쪽: number) => {
    const 응답 = await admin.get('/opsapi/users', { params: { page: 쪽 } });
    const 몸 = (await 응답.json().catch(() => ({}))) as { items?: { id: number }[] };
    return { status: 응답.status(), 번호들: (몸.items ?? []).map((u) => u.id).join(', ') };
  };
  await test.step('page 0 으로 GET /opsapi/users 를 부른다', async () => {
    const 앞 = await 목록(1);
    const 대상 = await 목록(params.영쪽);
    const 뒤 = await 목록(1);
    const 코드 = await verify('page 0 응답 코드가 기대 결과와 같다', 대상.status, expected.응답코드);
    const 같음 = await verify('page 0 의 계정 번호들이 page 1 의 계정 번호들과 같다', 대상.번호들, 대상.번호들 === 뒤.번호들 ? 뒤.번호들 : 앞.번호들);
    await verify('page 0 으로 GET /opsapi/users 를 부르면 page 1 과 같은 목록이 돌아온다', 코드 && 같음, true);
  });
  await test.step('page -1 로 GET /opsapi/users 를 부른다', async () => {
    const 앞 = await 목록(1);
    const 대상 = await 목록(params.음수쪽);
    const 뒤 = await 목록(1);
    const 코드 = await verify('page -1 응답 코드가 기대 결과와 같다', 대상.status, expected.응답코드);
    const 같음 = await verify('page -1 의 계정 번호들이 page 1 의 계정 번호들과 같다', 대상.번호들, 대상.번호들 === 뒤.번호들 ? 뒤.번호들 : 앞.번호들);
    await verify('page -1 일 때도 GET /opsapi/users 는 page 1 과 같은 목록이다', 코드 && 같음, true);
  });
});
