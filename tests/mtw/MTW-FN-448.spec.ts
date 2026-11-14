import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글찾기API } from './helpers/api.helper.js';
import { 반응풀기API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 모양설정화면 } from './pages/appearance-settings.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-448',
  name: '빠른 부스트를 켜고 부스트 아이콘을 누르면 메뉴 없이 바로 부스트된다',
  precondition: ['두 번째 사용자의 「빠른 부스트 활성화」가 켜져 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 모양설정화면(page);
  const 상세 = new 글상세화면(page);
  let 글번호: string | undefined;
  let 켰다 = false;

  await test.step('두 번째 사용자로 로그인하고 「빠른 부스트 활성화」를 켠다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 설정.열기();
    await 설정.빠른부스트바꾸고저장(true);
    켰다 = true;
    await verify('「빠른 부스트 활성화」가 켜져 있다', await 설정.빠른부스트.isChecked(), true, { blocker: true });
  });

  try {
    await test.step('빠른 부스트를 켜고 hana_photo 글의 부스트 아이콘을 누른다', async () => {
      const 글 = await 글찾기API(page, 'hana_photo', '4.7 의 인용');
      글번호 = 글.id;
      await 반응풀기API(page, 글.id);
      await 상세.열기(글경로(글));
      const 응답 = 상세.부스트응답받기();
      await 상세.부스트.click();
      const 부스트됨 = await verify('바로 부스트된다', await 응답, true);
      const 메뉴떴다 = await 상세.펼침.상자.first().waitFor({ timeout: 2_000 }).then(() => true, () => false);
      const 메뉴없음 = await verify('메뉴가 뜨지 않는다', 메뉴떴다, false);
      await verify('빠른 부스트를 켜고 부스트 아이콘을 누르면 메뉴 없이 바로 부스트된다', 부스트됨 && 메뉴없음, true);
    });

    await test.step('그 글의 「자세히」를 누른다', async () => {
      await 상세.자세히열기();
      await verify('「인용」은 「자세히」 메뉴에 보인다', await 상세.펼침.항목('인용').isVisible(), true);
    });
  } finally {
    if (글번호 !== undefined) await 반응풀기API(page, 글번호);
    if (켰다) {
      await 설정.열기();
      await 설정.빠른부스트바꾸고저장(false);
    }
  }
});
