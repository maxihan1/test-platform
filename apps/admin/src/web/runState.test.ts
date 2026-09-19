import { describe, expect, it } from 'vitest';

import { 도는중, 상태라벨 } from './runState.js';

describe('실행 상태', () => {
  it('RUNNING 일 때만 아직 도는 중이다', () => {
    expect(도는중('RUNNING')).toBe(true);
  });

  it('FINISHED 는 도는 중이 아니다', () => {
    expect(도는중('FINISHED')).toBe(false);
  });

  it('ABORTED 도 도는 중이 아니다. 사람이 멈춘 것도 끝난 것이다', () => {
    expect(도는중('ABORTED')).toBe(false);
  });

  it('모르는 상태는 도는 중으로 보지 않는다. 틀리면 2초마다 영원히 다시 묻는다', () => {
    expect(도는중('무엇인가')).toBe(false);
  });

  it('상태를 사람이 읽는 말로 바꾼다', () => {
    expect(상태라벨('RUNNING')).toBe('도는 중');
    expect(상태라벨('FINISHED')).toBe('끝남');
    expect(상태라벨('ABORTED')).toBe('중단됨');
  });

  it('모르는 상태는 그 글자를 그대로 보여준다. 지어내면 무엇이 일어났는지 숨긴다', () => {
    expect(상태라벨('무엇인가')).toBe('무엇인가');
  });
});
