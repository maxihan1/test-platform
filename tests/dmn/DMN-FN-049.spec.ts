import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기값, 기기등록, 기기모두지우기, 새푸시토큰, 새회원아이디, 푸시값, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-049',
  name: '기기가 있는 회원에게 푸시를 보내면 202 다',
  apiDoc: 1,
  smoke: true,
  precondition: ['기기가 하나 등록된 회원이 있다'],
  params: z.object({
    title: z.string().describe('푸시 제목 — 1~50자').default('배송 안내'),
    body: z.string().describe('푸시 내용 — 1~200자').default('주문하신 상품이 출발했습니다'),
  }),
  expected: null,
});

test(spec, async ({ api, params }) => {
  const 고객사 = api('데모마켓');
  const 회원 = 새회원아이디();
  const 지울기기: string[] = [];
  let 첫등록 = 0;

  try {
    await test.step('회원 기기를 하나 등록한다', async () => {
      const res = await 기기등록(고객사, 회원, 새푸시토큰());
      첫등록 = res.status();
      if (첫등록 === 201) 지울기기.push((await 기기값(res)).id);
    });

    await test.step('기기 등록 응답을 확인한다', async () => {
      await verify('기기 등록 응답이 201 이다', 첫등록, 201, { blocker: true });
    });

    await test.step('그 회원에게 제목 「배송 안내」 · 내용 「주문하신 상품이 출발했습니다」로 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: params.title, body: params.body });
      await verify('기기가 있는 회원에게 푸시를 보내면 202 다', res.status(), 202, { blocker: true });
      await verify('접수한 푸시의 상태가 QUEUED 다', (await 푸시값(res)).status, 'QUEUED');
    });
  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});
