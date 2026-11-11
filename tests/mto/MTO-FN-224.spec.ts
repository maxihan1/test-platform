import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 도메인차단불러오기화면 } from './pages/domain-block-import.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-224',
  name: '형식이 틀린 줄이 섞인 CSV 를 불러오면 오류 안내가 보이고 맞는 줄만 미리 보기에 남는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 불러오기 = new 도메인차단불러오기화면(page);
  const 도메인 = 시험도메인();

  await test.step('Owner 계정으로 로그인하고 도메인 차단 불러오기 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 불러오기.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 불러오기.제목.isVisible(), true, { blocker: true });
  });

  await test.step('형식이 틀린 줄과 맞는 줄이 섞인 CSV를 「불러오기」로 올린다', async () => {
    await 불러오기.올리기(`#domain,#severity\n${도메인},silence\nnot a domain!!,silence\n`);
    const 미리보기 = (await 불러오기.미리보기줄들.allInnerTexts()).map((글) => 글.replace(/\s+/g, ' ').trim());
    const 안내 = await verify('오류 안내가 보인다', await 불러오기.알림.모두.first().isVisible(), true);
    const 줄수 = await verify('미리 보기에 줄이 하나만 남는다', 미리보기.length, 1);
    const 남은줄 = await verify('남은 줄이 맞는 도메인 줄이다', (미리보기[0] ?? '').startsWith(도메인), true);
    await verify('형식이 틀린 줄이 섞인 CSV 를 불러오면 오류 안내가 보이고 맞는 줄만 미리 보기에 남는다', 안내 && 줄수 && 남은줄, true);
  });
});
