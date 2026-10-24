import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ASH-FN-679',
  name: 'Admin:Key 가 15자면 닫히고 16자면 열린다',
  platforms: ['android'],
  precondition: ['어드민 키 길이를 15자 · 16자로 바꿀 수 있는 서버가 있다'],
  techniques: ['경계값 분석'],
  held: '보류 — 서버 설정을 바꿔 다시 띄울 길이 없음',
  params: z.object({
    키길이: z.number().int().describe('대상 서버를 띄운 Admin:Key 의 글자 수 — 15 또는 16'),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  await test.step('서버의 어드민 키 길이를 확인한다', async () => {
    await verify('어드민 키 길이를 15자 · 16자로 바꿀 수 있는 서버가 있다', [15, 16].includes(params.키길이), true, { blocker: true });
  });
  await test.step('키 길이를 바꿔 서버를 띄우고 어드민 설정을 받는다', async () => {
    const 응답 = await admin.get('/admin/config');
    await verify('Admin:Key 가 15자면 닫히고 16자면 열린다', 응답.status() === 200, params.키길이 >= 16);
  });
});
