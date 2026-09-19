import { describe, expect, it } from 'vitest';

import { 도는중, 멈출수있나, 미실행사유, 상태라벨 } from './runState.js';

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

describe('실행 멈추기 (SPEC §8.3 · §3.5)', () => {
  it('도는 중이고 실행까지 등급이면 멈출 수 있다', () => {
    expect(멈출수있나('RUNNING', 'operator')).toBe(true);
    expect(멈출수있나('RUNNING', 'admin')).toBe(true);
  });

  it('보기만 등급에게는 멈춤 버튼이 없다. 흐리게가 아니라 아예 없다', () => {
    expect(멈출수있나('RUNNING', 'viewer')).toBe(false);
  });

  it('끝난 실행에는 보이지 않는다', () => {
    expect(멈출수있나('FINISHED', 'admin')).toBe(false);
    expect(멈출수있나('ABORTED', 'admin')).toBe(false);
  });

  it('로그인하지 않았으면 멈출 수 없다', () => {
    expect(멈출수있나('RUNNING', null)).toBe(false);
  });
});

describe('돌지 못한 항목의 사유 (SPEC §8.3)', () => {
  it('사람이 멈춘 것은 그렇게 적는다. 서버는 ABORTED 로 저장한다', () => {
    expect(미실행사유({ message: 'ABORTED' })).toBe('사용자가 멈춤');
  });

  it('그 밖의 사유는 서버가 넣은 한국어를 그대로 쓴다', () => {
    // 실측: CLOSE_UNFINISHED 가 '러너에 닿지 못했습니다' 를 한국어로 넣는다
    expect(미실행사유({ message: '러너에 닿지 못했습니다' })).toBe('러너에 닿지 못했습니다');
  });

  it('사유가 없으면 줄을 안 그린다', () => {
    expect(미실행사유(null)).toBe(null);
  });

  it('원문 오류는 목록에 쓰지 않는다. 상세의 접힌 자리에 둔다', () => {
    const 스택 = { message: 'connect ECONNREFUSED 127.0.0.1:4000', stack: 'Error: connect...' };
    expect(미실행사유(스택)).toBe('러너에 닿지 못했습니다');
  });
});
