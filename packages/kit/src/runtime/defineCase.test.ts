// 명세 선언이 CaseSpec(SPEC §5.1)으로 정확히 바뀌는지 검사한다. 화면의 입력 폼이 이 결과만 보고 만들어진다

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineCase, schemasOf } from './defineCase.js';

beforeAll(() => {
  // filePath는 테스트 루트 기준 상대 경로다. 이 파일이 루트인 셈 치고 검사한다
  process.env.PLATFORM_TESTS_DIR = dirname(fileURLToPath(import.meta.url));
});

describe('defineCase', () => {
  it('선언한 값을 CaseSpec에 그대로 담는다', () => {
    const spec = defineCase({
      tcId: 'DEMO-001',
      name: '메인 화면이 열린다',
      platforms: ['desktop', 'mobile'],
      precondition: ['데모 사이트에 접근할 수 있다'],
      params: null,
      expected: null,
    });

    expect(spec.tcId).toBe('DEMO-001');
    expect(spec.name).toBe('메인 화면이 열린다');
    expect(spec.platforms).toEqual(['desktop', 'mobile']);
    expect(spec.precondition).toEqual(['데모 사이트에 접근할 수 있다']);
    expect(spec.filePath).toBe('defineCase.test.ts');
  });

  it('platforms를 생략하면 desktop 하나로 둔다', () => {
    const spec = defineCase({
      tcId: 'DEMO-002',
      name: '환경을 적지 않은 케이스',
      precondition: [],
      params: null,
      expected: null,
    });

    expect(spec.platforms).toEqual(['desktop']);
  });

  it('없다고 적은 자리는 빈 객체 스키마가 된다', () => {
    const spec = defineCase({
      tcId: 'DEMO-003',
      name: '입력값이 없는 케이스',
      precondition: [],
      params: null,
      expected: null,
    });

    expect(spec.paramSchema).toMatchObject({ type: 'object', properties: {} });
    expect(spec.expectedSchema).toMatchObject({ type: 'object', properties: {} });
  });

  it('zod 스키마는 라벨·기본값·선택지가 살아 있는 JSON Schema가 된다', () => {
    const spec = defineCase({
      tcId: 'DEMO-004',
      name: '입력값이 있는 케이스',
      precondition: [],
      params: z.object({
        resource: z.enum(['albums', 'photos']).describe('조회할 자원').default('albums'),
        postId: z.number().describe('글 번호').optional(),
        title: z.string().min(1).describe('글 제목'),
      }),
      expected: z.object({
        statusCode: z.number().describe('응답 코드').default(200),
      }),
    });

    expect(spec.paramSchema).toMatchObject({
      type: 'object',
      properties: {
        resource: { type: 'string', enum: ['albums', 'photos'], description: '조회할 자원', default: 'albums' },
        postId: { type: 'number', description: '글 번호' },
        title: { type: 'string', minLength: 1, description: '글 제목' },
      },
      required: ['title'],
    });
    expect(spec.expectedSchema).toMatchObject({
      properties: { statusCode: { type: 'number', description: '응답 코드', default: 200 } },
    });
  });

  it('선언에 쓴 zod 스키마를 실행 시점에 다시 꺼낼 수 있다', () => {
    const params = z.object({ username: z.string().describe('아이디') });
    const spec = defineCase({
      tcId: 'DEMO-005',
      name: '스키마 보관 확인',
      precondition: [],
      params,
      expected: null,
    });

    expect(schemasOf(spec).params).toBe(params);
    expect(schemasOf(spec).expected).toBeNull();
  });

  it('스키마는 JSON으로 내보내도 명세에 섞이지 않는다', () => {
    const spec = defineCase({
      tcId: 'DEMO-006',
      name: 'JSON 직렬화 확인',
      precondition: [],
      params: z.object({ username: z.string().describe('아이디') }),
      expected: null,
    });

    expect(Object.keys(JSON.parse(JSON.stringify(spec))).sort()).toEqual([
      'expectedSchema',
      'filePath',
      'name',
      'paramSchema',
      'platforms',
      'precondition',
      'tcId',
    ]);
  });

  it('미확정 사유를 주면 명세에 그대로 싣는다', () => {
    const spec = defineCase({
      tcId: 'DEMO-007',
      name: '미확정 케이스',
      precondition: [],
      params: null,
      expected: null,
      unconfirmed: '기획서와 다름',
    });

    expect(spec.unconfirmed).toBe('기획서와 다름');
  });

  it('미확정 사유를 안 주면 키 자체가 없다', () => {
    const spec = defineCase({
      tcId: 'DEMO-008',
      name: '확정 케이스',
      precondition: [],
      params: null,
      expected: null,
    });

    expect('unconfirmed' in spec).toBe(false);
  });

  it('미확정 사유가 비면 확정으로 보고 키를 싣지 않는다', () => {
    const spec = defineCase({
      tcId: 'DEMO-009',
      name: '빈 사유 케이스',
      precondition: [],
      params: null,
      expected: null,
      unconfirmed: '',
    });

    expect('unconfirmed' in spec).toBe(false);
  });

  it('미확정 사유가 공백뿐이면 확정으로 보고 키를 싣지 않는다', () => {
    const spec = defineCase({
      tcId: 'DEMO-010',
      name: '공백 사유 케이스',
      precondition: [],
      params: null,
      expected: null,
      unconfirmed: '   ',
    });

    expect('unconfirmed' in spec).toBe(false);
  });
});
