import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내번호 } from './helpers/account.helper.js';
import { 머리, 고유이름 } from './helpers/auth.helper.js';
import { 컬렉션개수, 컬렉션채우기, 컬렉션비우기 } from './helpers/social.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-680',
  name: '컬렉션 10개째를 만들면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다', '두 번째 사용자의 컬렉션이 9개다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('안쪽 값일 때 응답 코드').default(200),
    바깥쪽응답코드: z.number().describe('바깥쪽 값일 때 응답 코드').default(422),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  let 번호들: string[] = [];
  try {
    const 계정 = await 내번호(request, 토큰);
    번호들 = await 컬렉션채우기(request, 토큰, 계정, 9);
    const 개수 = await 컬렉션개수(request, 토큰, 계정);
    await test.step('준비한 컬렉션을 확인한다', async () => {
      await verify('두 번째 사용자의 컬렉션이 9개다', 개수 === 9, true, { blocker: true });
    });
    await test.step('두 번째 사용자가 컬렉션 10개째를 만든다', async () => {
      const 응답 = await request.post('/api/v1/collections', {
        headers: 머리(토큰),
        data: { name: 고유이름('MTI 묶음 ').slice(0, 30), description: 'MTI 시험 컬렉션', sensitive: false, discoverable: false },
      });
      if (응답.status() === 200) 번호들.push(((await 응답.json()) as { collection?: { id?: string } }).collection?.id ?? '');
      await verify('컬렉션 10개째를 만들면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('두 번째 사용자가 컬렉션 11개째를 만든다', async () => {
      const 응답 = await request.post('/api/v1/collections', {
        headers: 머리(토큰),
        data: { name: 고유이름('MTI 묶음 ').slice(0, 30), description: 'MTI 시험 컬렉션', sensitive: false, discoverable: false },
      });
      if (응답.status() === 200) 번호들.push(((await 응답.json()) as { collection?: { id?: string } }).collection?.id ?? '');
      await verify('컬렉션 11개째 만들기의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    await 컬렉션비우기(request, 토큰, 번호들);
  }
});
