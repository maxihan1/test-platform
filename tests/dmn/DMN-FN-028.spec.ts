import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기값, 기기등록, 기기모두지우기, 새푸시토큰, 새회원아이디 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-028',
  name: '회원 아이디 · 플랫폼 · pushToken 으로 기기를 등록하면 201 이다',
  apiDoc: 1,
  smoke: true,
  precondition: ['기기가 없는 새 회원 아이디다'],
  params: z.object({
    platform: z.enum(['android', 'ios']).describe('등록할 플랫폼 — android 나 ios').default('android'),
  }),
  expected: null,
});

test(spec, async ({ api, params }) => {
  const 고객사 = api('데모마켓');
  const 회원 = 새회원아이디();
  const 토큰 = 새푸시토큰();
  const 지울기기: string[] = [];
  let 기기번호 = '';

  try {
    await test.step('새 회원 아이디로 「android」 기기를 등록한다', async () => {
      const res = await 기기등록(고객사, 회원, 토큰, params.platform);
      if (res.status() === 201) {
        기기번호 = (await 기기값(res)).id;
        지울기기.push(기기번호);
      }
      await verify('회원 아이디 · 플랫폼 · pushToken 으로 기기를 등록하면 201 이다', res.status(), 201, { blocker: true });
    });

    await test.step('등록한 기기를 조회한다', async () => {
      const 기기 = await 기기값(await 고객사.get(`/v1/devices/${기기번호}`));
      await verify(
        '등록한 기기를 조회하면 등록한 회원 아이디 · 플랫폼 · pushToken 이 그대로 온다',
        `${기기.userId} ${기기.platform} ${기기.pushToken}`,
        `${회원} ${params.platform} ${토큰}`,
      );
    });
  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});
