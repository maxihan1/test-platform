import { defineCase, test, verify } from '@platform/kit';

import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-946',
  name: '사유 없는 제한 서버가 든 정보 화면에서 「제한된 서버들」을 펼치면 「사유를 밝히지 않음」이 보인다',
  precondition: ['제한된 서버 목록 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 정보화면(page);
  const 풀기목록: 풀기[] = [];

  try {
    await test.step('제한된 서버 목록 응답을 바꾸고 정보 화면을 연다', async () => {
      await 한국어로(page);
      풀기목록.push(
        await 가짜응답(page, /\/api\/v1\/instance\/domain_blocks/, {
          본문: [{ domain: 'blocked.example', digest: 'c0ffee', severity: 'suspend', comment: '' }],
        }),
      );
      await 화면.열기();
      await verify('정보 화면에 「제한된 서버들」 펼침 머리가 보인다', await 화면.구획머리('제한된 서버들').isVisible(), true, { blocker: true });
    });

    await test.step('사유 없는 제한 서버가 든 정보 화면에서 「제한된 서버들」을 펼친다', async () => {
      await 화면.펼치기('제한된 서버들');
      const 보인다 = await 화면.구획글('제한된 서버들', '사유를 밝히지 않음').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('사유 없는 제한 서버가 든 정보 화면에서 「제한된 서버들」을 펼치면 「사유를 밝히지 않음」이 보인다', 보인다, true);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
