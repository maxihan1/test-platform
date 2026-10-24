import { defineCase, test, verify } from '@platform/kit';

import { 계정찾기, 랜덤글, 정리부르기 } from './helpers/admin.helper.js';
import { 새계정, 오류 } from './helpers/api.helper.js';
import { 계정지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-566',
  name: '2자 앞머리로 정리를 부르면 400 「VALIDATION_FAILED」다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다', '3자 앞머리로 시작하는 새 계정이 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 세자 = `zq${랜덤글(1)}`;
  try {
    await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
      await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
    });
    await test.step('2자 앞머리로 정리를 부른다', async () => {
      const 응답 = await 정리부르기(admin, 'zq');
      const 코드 = await verify('응답 코드가 400 이다', 응답.status(), 400);
      const 사유 = await verify('오류 코드가 「VALIDATION_FAILED」다', (await 오류(응답)).code, 'VALIDATION_FAILED');
      await verify('2자 앞머리로 정리를 부르면 400 「VALIDATION_FAILED」다', 코드 && 사유, true);
    });
    await test.step('3자 앞머리로 시작하는 새 계정을 만든다', async () => {
      await 새계정(admin, 세자);
    });
    await test.step('3자 앞머리로 시작하는 새 계정을 확인한다', async () => {
      await verify('3자 앞머리로 시작하는 새 계정이 있다', (await 계정찾기(admin, 세자)).length, 1, { blocker: true });
    });
    await test.step('3자 앞머리로 정리를 부른다', async () => {
      await 정리부르기(admin, 세자);
      await verify('3자 앞머리로 정리를 부르면 그 계정이 지워진다', (await 계정찾기(admin, 세자)).length, 0);
    });
  } finally {
    await 계정지우기(admin, 세자);
  }
});
