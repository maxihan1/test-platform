import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  끝났다고알릴까,
  도는중,
  멈출수있나,
  미실행사유,
  본것으로적는다,
  상태라벨,
  실행자이름,
  알림본적있나,
  칸사유,
} from './runState.js';

// 본 알림은 브라우저에 남는다. jsdom 을 설치하지 않았으므로 가짜를 끼운다 (api.test.ts 와 같은 방식)
const 보관 = new Map<string, string>();
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => 보관.get(key) ?? null,
  setItem: (key: string, value: string) => 보관.set(key, value),
  removeItem: (key: string) => 보관.delete(key),
});

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
    expect(상태라벨('RUNNING')).toBe('진행 중');
    expect(상태라벨('FINISHED')).toBe('완료');
    expect(상태라벨('ABORTED')).toBe('중단');
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

describe('사유는 미실행 항목에만 붙는다 (SPEC §8.3)', () => {
  const 항목 = (status: 'PASS' | 'FAIL' | 'NA', message: string | null) => ({
    status,
    error: message === null ? null : { message },
  });

  it('실패한 테스트에는 사유를 안 붙인다. 붙이면 러너 장애로 뒤바뀐다', () => {
    // 러너는 FAIL 이 예외로 끝나도 error 를 채운다 (kit 의 reporter.ts).
    // 그 영문 메시지를 「러너에 닿지 못했습니다」로 바꾸면 테스트 실패가 장애로 보인다
    const 칸 = [항목('FAIL', 'Timeout 5000ms exceeded')];
    expect(칸사유(칸)).toBe(null);
  });

  it('통과한 항목에도 안 붙인다', () => {
    expect(칸사유([항목('PASS', null)])).toBe(null);
  });

  it('미실행 항목의 사유만 쓴다', () => {
    const 칸 = [항목('PASS', null), 항목('NA', 'ABORTED')];
    expect(칸사유(칸)).toBe('사용자가 멈춤');
  });

  it('미실행인데 사유가 없으면 줄을 안 그린다', () => {
    expect(칸사유([항목('NA', null)])).toBe(null);
  });
});

describe('실행이 끝났을 때 알린다 (SPEC §8.9)', () => {
  beforeEach(() => {
    // 본 것은 브라우저에 남는다. 검사마다 비운다
    보관.clear();
  });

  it('도는 중에서 끝나면 알린다', () => {
    expect(끝났다고알릴까({ 전: 'RUNNING', 후: 'FINISHED', runId: 1 })).toBe(true);
  });

  it('사람이 멈춘 것도 끝난 것이다', () => {
    expect(끝났다고알릴까({ 전: 'RUNNING', 후: 'ABORTED', runId: 2 })).toBe(true);
  });

  it('처음부터 끝나 있던 실행에는 안 알린다. 그것은 새 소식이 아니다', () => {
    expect(끝났다고알릴까({ 전: 'FINISHED', 후: 'FINISHED', runId: 3 })).toBe(false);
  });

  it('아직 도는 중이면 안 알린다', () => {
    expect(끝났다고알릴까({ 전: 'RUNNING', 후: 'RUNNING', runId: 4 })).toBe(false);
  });

  it('한 번 본 실행은 다시 안 알린다. 새로고침해도 마찬가지다', () => {
    본것으로적는다(5);
    expect(끝났다고알릴까({ 전: 'RUNNING', 후: 'FINISHED', runId: 5 })).toBe(false);
    expect(알림본적있나(5)).toBe(true);
  });

  it('다른 실행은 그대로 알린다', () => {
    본것으로적는다(6);
    expect(끝났다고알릴까({ 전: 'RUNNING', 후: 'FINISHED', runId: 7 })).toBe(true);
  });
});

describe('실행자 이름 (SPEC §3.5 · §8.7)', () => {
  it('박제된 이름이 있으면 그것을 쓴다. 아이디가 아니다', () => {
    expect(실행자이름({ triggeredBy: 'kim', triggeredByName: '김철수' })).toBe('김철수');
  });

  it('이름이 비면 모른다고 적는다. 값을 지어내 채우지 않는다', () => {
    expect(실행자이름({ triggeredBy: 'kim', triggeredByName: null })).toBe('실행자 미상 (인증 도입 이전)');
    expect(실행자이름({ triggeredBy: 'kim', triggeredByName: '' })).toBe('실행자 미상 (인증 도입 이전)');
  });

  it('정기 실행은 따로 가를 것이 없다. 스케줄러가 이름을 그렇게 박아 넣는다', () => {
    // 실측: scripts/run-scheduled.ts 가 triggeredByName 을 '스케줄러' 로 넣는다
    expect(실행자이름({ triggeredBy: '스케줄러', triggeredByName: '스케줄러' })).toBe('스케줄러');
  });
});
