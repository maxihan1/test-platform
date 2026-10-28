import { defineCase, test, verify } from '@platform/kit';

import { 쪽값, 푸시이력 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-115',
  name: 'size 없이 푸시 이력을 부르면 한 쪽 크기가 20 이다',
  apiDoc: 1,
  precondition: ['데모마켓 고객사 API 인증이 등록돼 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');

  await test.step('size 없이 푸시 이력을 부른다', async () => {
    const 쪽 = await 쪽값(await 푸시이력(고객사, {}));
    const 크기 = await verify('응답의 한 쪽 크기 칸이 20 이다', 쪽.size, 20);
    const 건수 = await verify('온 푸시가 20건 이하다', 쪽.items.length <= 20, true);
    await verify('size 없이 푸시 이력을 부르면 한 쪽 크기가 20 이다', 크기 && 건수, true);
  });
});
