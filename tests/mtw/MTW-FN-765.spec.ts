import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { CSV만들기 } from './helpers/media.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-765',
  name: '빈 CSV 를 올리면 「빈 CSV 파일」이 보인다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 설정 = new 계정설정화면(page);
  const 올리기 = async (종류: string, 줄들: string[]): Promise<void> => {
    await 설정.열기('/settings/imports');
    await 설정.고르기('불러오기 종류', 종류);
    await 설정.파일칸().setInputFiles(CSV만들기('import.csv', 줄들));
    await 설정.보내기('업로드');
  };

  await test.step('두 번째 사용자로 로그인한다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
  });

  await test.step('데이터 가져오기에 빈 CSV 를 올린다', async () => {
    await 올리기('팔로잉 목록', []);
    await verify('빈 CSV 를 올리면 「빈 CSV 파일」이 보인다', await 설정.글('빈 CSV 파일').isVisible(), true);
  });

  await test.step('데이터 가져오기에 유형과 맞지 않는 CSV 를 올린다', async () => {
    await 올리기('도메인 차단 목록', ['Account address,Show boosts,Notify on new posts,Languages', 'hana_photo@mastodon.maxihan.com,true,false,']);
    await verify('유형과 맞지 않는 CSV 에는 「호환되지 않는 가져오기 유형을 선택함」이 보인다', await 설정.글('호환되지 않는 가져오기 유형을 선택함').isVisible(), true);
    if (await 설정.링크('취소').isVisible()) await 설정.링크('취소').click();
  });
});
