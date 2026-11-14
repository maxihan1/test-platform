import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { CSV만들기 } from './helpers/media.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-761',
  name: '20,000행 CSV 를 올리면 확인 화면으로 넘어간다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    행한도: z.number().describe('가져오기 파일 행 한도').default(20_000),
  }),
});
test(spec, async ({ page, params, expected }) => {
  const 설정 = new 계정설정화면(page);
  const 줄들 = (수: number): string[] => ['#domain', ...Array.from({ length: 수 }, (_, i) => `tc-import-${String(i)}.example`)];

  await test.step('두 번째 사용자로 로그인한다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
  });

  await test.step('데이터 가져오기에 20,000행 CSV 를 올린다', async () => {
    const 결과 = await 설정.가져오기양식보내기('domain_blocking', CSV만들기('d20000.csv', 줄들(expected.행한도)));
    if (결과.주소 !== '/settings/imports') await 설정.열기(결과.주소);
    const 확인 = await verify('20,000행 CSV 를 올리면 확인 화면으로 넘어간다', await 설정.링크('확인').isVisible(), true);
    if (확인) {
      await 설정.링크('취소').click();
      await 설정.버튼('업로드').waitFor({ timeout: 15_000 });
    }
  });

  await test.step('데이터 가져오기에 20,001행 CSV 를 올린다', async () => {
    const 결과 = await 설정.가져오기양식보내기('domain_blocking', CSV만들기('d20001.csv', 줄들(expected.행한도 + 1)));
    if (결과.주소 !== '/settings/imports') {
      await 설정.열기(결과.주소);
      await 설정.링크('취소').click();
    }
    await verify('20,001행 CSV 에는 「20000개 이상의 열을 포함합니다」가 보인다', 결과.글.includes('20000개 이상의 열을 포함합니다'), true);
  });
});
