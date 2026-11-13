import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 점검화면 } from './pages/maintenance.page.js';
import { 점검끄고앞상태받기, 점검원래대로 } from './helpers/maintenance-dash.helper.js';
import { 점검읽기 } from './helpers/ops-api.helper.js';
import type { 점검 as 점검상태 } from './helpers/ops-api.helper.js';
import { 내일입력값, 내일ISO, 점검바꾸기 } from './helpers/maintenance-dash.helper.js';
import { 글자 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-608',
  name: '안내 문구를 비우고 점검을 켜 저장하면 토스트 「점검 안내 문구를 1~300자로 입력하세요」가 뜬다',
  techniques: ['경계값 분석'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    짧은안내글자수: z.number().int().min(1).max(300).describe('켜서 저장할 안내 문구 글자 수 — 1~300자').default(1),
    긴안내글자수: z.number().int().min(1).max(300).describe('켜서 저장할 긴 안내 문구 글자 수 — 1~300자').default(300),
    넘는안내글자수: z.number().int().min(301).max(1000).describe('API 로 켤 때 거절될 안내 문구 글자 수 — 301~1000자').default(301),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 점검 = new 점검화면(page);
  let 앞: 점검상태 | undefined;

  try {
    await test.step('운영자 계정으로 로그인하고 점검을 꺼 둔 채 「점검」 화면을 연다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      앞 = await 점검끄고앞상태받기(page);
      await 점검.열기();
      await 점검.틀.그려질때까지();
      await verify('「점검」 화면에 「저장」 버튼이 보인다', await 점검.저장버튼.isVisible(), true, { blocker: true });
      await verify('점검이 꺼져 있다', (await 점검읽기(page)).enabled, false, { blocker: true });
    });

    await test.step('안내 문구를 비우고 「점검 켜기」를 켜 저장한다', async () => {
      await 점검.켜기고르기(true);
      await 점검.안내적기('');
      await 점검.시작정하기(내일입력값());
      await 점검.저장누르기();
      await 점검.확인창넘기기('점검 켜기');
      await verify('안내 문구를 비우고 점검을 켜 저장하면 토스트 「점검 안내 문구를 1~300자로 입력하세요」가 뜬다', await 점검.알림.뜰때까지('점검 안내 문구를 1~300자로 입력하세요'), true);
    });

    await test.step('시작을 내일로 정하고 안내 문구 1자로 점검을 켜 저장한다', async () => {
      await 점검끄고앞상태받기(page);
      await 점검.열기();
      await 점검.켜기고르기(true);
      await 점검.시작정하기(내일입력값());
      await 점검.안내적기(글자(params.짧은안내글자수));
      await 점검.저장누르기();
      await 점검.확인창넘기기('점검 켜기');
      await 점검.알림.뜰때까지('점검 설정을 저장했습니다');
      const 저장됨 = await 점검읽기(page);
      await verify('안내 문구 1자로 켠 점검은 저장된다', 저장됨.enabled ? 저장됨.message.length : -1, params.짧은안내글자수);
    });

    await test.step('시작을 내일로 정하고 안내 문구 300자로 점검을 켜 저장한다', async () => {
      await 점검끄고앞상태받기(page);
      await 점검.열기();
      await 점검.켜기고르기(true);
      await 점검.시작정하기(내일입력값());
      await 점검.안내적기(글자(params.긴안내글자수));
      await 점검.저장누르기();
      await 점검.확인창넘기기('점검 켜기');
      await 점검.알림.뜰때까지('점검 설정을 저장했습니다');
      const 저장됨 = await 점검읽기(page);
      await verify('안내 문구 300자로 켠 점검은 저장된다', 저장됨.enabled ? 저장됨.message.length : -1, params.긴안내글자수);
    });

    await test.step('API 로 안내 문구 301자인 켠 점검을 저장한다', async () => {
      await 점검끄고앞상태받기(page);
      const 응답 = await 점검바꾸기(page, { enabled: true, message: 글자(params.넘는안내글자수), startsAt: 내일ISO(), endsAt: null, allowedAccountIds: '' });
      const 코드 = await verify('안내 문구가 넘는 켠 점검 저장의 응답 코드는 400 이다', 응답.status, 400);
      const 문구 = await verify('응답 본문의 message 가 「점검 안내 문구를 1~300자로 입력하세요」다', 응답.body.message, '점검 안내 문구를 1~300자로 입력하세요');
      await verify('안내 문구 301자로 켠 점검은 「점검 안내 문구를 1~300자로 입력하세요」로 거절된다', 코드 && 문구, true);
    });
  } finally {
    if (앞 !== undefined) await 점검원래대로(page, 앞);
  }
});
