import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 긴글, 내소개API, 프로필되돌리기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-596',
  name: '필드 라벨을 40자로 넣으면 「추천하는 글자수 제한을 초과했습니다.」가 보이지 않는다',
  techniques: ['경계값 분석'],
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 편집 = new 프로필편집화면(page);
  let 원래: Awaited<ReturnType<typeof 내소개API>> | undefined;

  try {
    await test.step('두 번째 사용자로 로그인하고 프로필 편집 화면을 연다', async () => {
      await 로그인하기(page, params.secondId, params.secondPassword);
      원래 = await 내소개API(page);
      await 프로필되돌리기API(page, { ...원래, fields: [] });
      await 편집.열기();
      await verify('프로필 편집 화면에 「필드 추가」 버튼이 보인다', await 편집.필드추가.isVisible(), true, { blocker: true });
    });

    await test.step('프로필 편집 사용자 정의 필드 라벨에 40자를 넣는다', async () => {
      await 편집.필드창열기();
      await 편집.라벨넣기(긴글(40));
      await 편집.필드카운터(40).first().waitFor();
      await verify('필드 라벨을 40자로 넣으면 「추천하는 글자수 제한을 초과했습니다.」가 보이지 않는다', await 편집.글자수초과.isVisible(), false);
      await 편집.창닫기();
    });

    await test.step('프로필 편집 사용자 정의 필드 라벨에 41자를 넣는다', async () => {
      await 편집.필드창열기();
      await 편집.라벨넣기(긴글(41));
      await 편집.필드카운터(41).first().waitFor();
      const 보인다 = await 편집.글자수초과.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('41자 라벨에는 「추천하는 글자수 제한을 초과했습니다.」가 보인다', 보인다, true);
      await 편집.창닫기();
    });

    await test.step('프로필 편집에서 사용자 정의 필드를 4개까지 더한다', async () => {
      await 프로필되돌리기API(page, { ...원래, fields: [{ name: 'TC가', value: 'a' }, { name: 'TC나', value: 'b' }, { name: 'TC다', value: 'c' }] });
      await 편집.열기();
      await 편집.필드편집버튼.first().waitFor();
      await 편집.필드창열기();
      await 편집.라벨넣기('TC라');
      await 편집.내용칸.fill('d');
      await 편집.창저장누르기();
      await 편집.필드편집버튼.nth(3).waitFor();
      await verify('사용자 정의 필드는 4개까지 더해진다', await 편집.필드편집버튼.count(), 4);
    });

    await test.step('사용자 정의 필드가 4개일 때 「필드 추가」를 찾는다', async () => {
      await verify('필드가 4개일 때 「필드 추가」는 누를 수 없다', await 편집.필드추가.isVisible(), false);
    });
  } finally {
    if (원래 !== undefined) await 프로필되돌리기API(page, 원래);
  }
});
