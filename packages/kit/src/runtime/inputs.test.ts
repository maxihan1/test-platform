// 러너가 환경변수로 실어 보낸 입력값·기대값이 케이스에 어떻게 도착하는지 검사한다 (SPEC §5.2)

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineCase } from './defineCase.js';
import { injectedInputs, resolveInputs } from './inputs.js';

const withParams = defineCase({
  tcId: 'DEMO-101',
  name: '입력값이 있는 케이스',
  precondition: [],
  params: z.object({
    title: z.string().describe('글 제목').default('기본 제목'),
    userId: z.number().describe('작성자 번호'),
  }),
  expected: z.object({ statusCode: z.number().describe('응답 코드').default(201) }),
});

const withoutParams = defineCase({
  tcId: 'DEMO-102',
  name: '입력값이 없는 케이스',
  precondition: [],
  params: null,
  expected: null,
});

describe('injectedInputs', () => {
  it('환경변수가 없으면 빈 값으로 둔다', () => {
    expect(injectedInputs({})).toEqual({ params: {}, expected: {} });
  });

  it('params와 expected를 한 객체로 실어 보낸 것을 갈라 읽는다', () => {
    const raw = JSON.stringify({ params: { userId: 7 }, expected: { statusCode: 200 } });

    expect(injectedInputs({ PLATFORM_PARAMS: raw })).toEqual({
      params: { userId: 7 },
      expected: { statusCode: 200 },
    });
  });

  it('JSON이 아니면 무엇이 잘못됐는지 알리며 멈춘다', () => {
    expect(() => injectedInputs({ PLATFORM_PARAMS: '{망가진' })).toThrow(/PLATFORM_PARAMS/);
  });
});

describe('resolveInputs', () => {
  it('주입된 값이 없으면 스키마의 기본값이 들어간다', () => {
    const resolved = resolveInputs(withParams, { params: { userId: 7 }, expected: {} });

    expect(resolved.params).toEqual({ title: '기본 제목', userId: 7 });
    expect(resolved.expected).toEqual({ statusCode: 201 });
  });

  it('주입된 값이 기본값을 덮는다', () => {
    const resolved = resolveInputs(withParams, {
      params: { title: '바뀐 제목', userId: 9 },
      expected: { statusCode: 200 },
    });

    expect(resolved.params).toEqual({ title: '바뀐 제목', userId: 9 });
    expect(resolved.expected).toEqual({ statusCode: 200 });
  });

  it('명세에 어긋나는 값이면 케이스와 항목을 짚어 멈춘다', () => {
    expect(() => resolveInputs(withParams, { params: {}, expected: {} })).toThrow(/DEMO-101.*입력값.*userId/s);
  });

  it('없다고 적은 케이스에는 빈 객체를 넘긴다', () => {
    expect(resolveInputs(withoutParams, { params: { 버려질: 1 }, expected: {} })).toEqual({
      params: {},
      expected: {},
    });
  });
});
