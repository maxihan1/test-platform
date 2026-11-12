// 메시지 틀 · 지문이 값만 바뀐 오류를 하나로 묶고 다른 오류는 가르는지 본다
import { describe, expect, it } from 'vitest';

import { 게임단계, 게임예외지문, 메시지틀, 앱ANR지문, 앱크래시지문, 웹네트워크지문, 웹콘솔지문, 주소틀 } from './fingerprint.js';

describe('메시지틀', () => {
  it('숫자 · uuid · 긴 16진 · 따옴표 안 값 · 물음표 뒤를 * 로 바꾼다', () => {
    expect(메시지틀('주문 1234 실패 id=3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe('주문 * 실패 id=*');
    expect(메시지틀('토큰 0123456789abcdef0 거절')).toBe('토큰 * 거절');
    expect(메시지틀(`Cannot read properties of undefined (reading 'map')`)).toBe(`Cannot read properties of undefined (reading '*')`);
    expect(메시지틀('GET https://a.com/x?page=2&q=검색 실패')).toBe('GET https://a.com/x?* 실패');
  });

  it('줄임표는 따옴표로 보지 않고 코드 조각의 물음표는 그대로 둔다', () => {
    expect(메시지틀(`Can't load 'avatar' — it's gone`)).toBe(`Can't load '*' — it's gone`);
    expect(메시지틀('a?.b is undefined')).toBe('a?.b is undefined');
  });

  it('200자에서 자른다', () => {
    expect(메시지틀('가'.repeat(300))).toHaveLength(200);
  });
});

describe('주소틀', () => {
  it('호스트까지 넣고 숫자 칸은 :n 으로 접는다', () => {
    expect(주소틀('https://API.demo.com/api/v1/statuses/42?x=1')).toBe('api.demo.com/api/v1/statuses/:n');
  });

  it('http 가 아니면 프로토콜 한 낱말이다', () => {
    expect(주소틀('data:image/png;base64,AAAA')).toBe('data:');
    expect(주소틀('wss://a.com/socket')).toBe('wss:');
  });
});

describe('웹콘솔지문', () => {
  it('값만 다른 같은 오류는 같은 지문이고 스택은 보지 않는다', () => {
    const a = 웹콘솔지문('pageerror', "TypeError: Cannot read properties of undefined (reading 'id')\n    at e (main.3f2a1b.js:1:200)", 'https://m.demo.com/statuses/1');
    const b = 웹콘솔지문('pageerror', "TypeError: Cannot read properties of undefined (reading 'name')\n    at t (main.9c8d7e.js:1:999)", 'https://m.demo.com/statuses/2');
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.source).toBe('WEB_PAGEERROR');
    expect(a.title).toBe(`TypeError · Cannot read properties of undefined (reading '*')`);
  });

  it('화면이 다르거나 종류가 다르면 갈린다', () => {
    const a = 웹콘솔지문('error', '저장 실패', 'https://m.demo.com/home');
    expect(웹콘솔지문('error', '저장 실패', 'https://m.demo.com/settings').fingerprint).not.toBe(a.fingerprint);
    expect(웹콘솔지문('pageerror', '저장 실패', 'https://m.demo.com/home').fingerprint).not.toBe(a.fingerprint);
  });

  it('오류 이름이 없으면 「콘솔 오류」 이름이다', () => {
    expect(웹콘솔지문('error', '저장 실패', '').title).toBe('콘솔 오류 · 저장 실패');
  });
});

describe('웹네트워크지문', () => {
  it('제목은 코드 · 메서드 · 경로이고 같은 경로 다른 번호는 같은 지문이다', () => {
    const a = 웹네트워크지문(500, 'post', 'https://m.demo.com/api/v1/statuses/7', 'https://m.demo.com/home');
    expect(a.title).toBe('HTTP 500 · POST /api/v1/statuses/:n');
    expect(웹네트워크지문(500, 'POST', 'https://m.demo.com/api/v1/statuses/8', 'https://m.demo.com/home').fingerprint).toBe(a.fingerprint);
  });

  it('호스트 · 코드가 다르면 갈리고 응답 없이 끊긴 요청은 「요청 끊김」이다', () => {
    const a = 웹네트워크지문(500, 'GET', 'https://m.demo.com/api/x', '');
    expect(웹네트워크지문(500, 'GET', 'https://cdn.demo.com/api/x', '').fingerprint).not.toBe(a.fingerprint);
    expect(웹네트워크지문(502, 'GET', 'https://m.demo.com/api/x', '').fingerprint).not.toBe(a.fingerprint);
    expect(웹네트워크지문(null, 'GET', 'https://m.demo.com/api/x', '').title).toBe('요청 끊김 · GET /api/x');
  });
});

describe('앱크래시지문', () => {
  const 프레임 = [
    '\tat android.os.Handler.dispatchMessage(Handler.java:106)',
    '\tat org.joinmastodon.android.ui.Foo.bind(Foo.kt:42)',
    '\tat org.joinmastodon.android.ui.Bar$1.run(Bar.kt:7)',
  ];

  it('앱 프레임만 골라 줄 번호를 빼고 묶는다', () => {
    const a = 앱크래시지문('org.joinmastodon.android', 'java.lang.NullPointerException', 프레임);
    const b = 앱크래시지문('org.joinmastodon.android', 'java.lang.NullPointerException', 프레임.map((x) => x.replace(/:\d+\)/, ':99)')));
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.title).toBe('NullPointerException · Foo.bind');
  });

  it('예외 줄의 메시지는 지문에 안 넣고 message 칸에 틀로 남긴다', () => {
    const a = 앱크래시지문('org.joinmastodon.android', 'java.lang.IndexOutOfBoundsException: Index 3 out of bounds', 프레임);
    expect(a.fingerprint).toBe(앱크래시지문('org.joinmastodon.android', 'java.lang.IndexOutOfBoundsException: Index 9 out of bounds', 프레임).fingerprint);
    expect(a.message).toBe('java.lang.IndexOutOfBoundsException: Index * out of bounds');
  });

  it('익명 클래스 · 람다 번호가 빌드마다 바뀌어도 같은 지문이다', () => {
    const a = 앱크래시지문('org.joinmastodon.android', 'java.lang.NullPointerException', 프레임);
    expect(앱크래시지문('org.joinmastodon.android', 'java.lang.NullPointerException', 프레임.map((x) => x.replace('Bar$1', 'Bar$2'))).fingerprint).toBe(a.fingerprint);
  });

  it('앱 프레임이 없으면 맨 위 셋을 쓴다', () => {
    expect(앱크래시지문('com.other', 'java.lang.IllegalStateException', 프레임).title).toBe('IllegalStateException · Handler.dispatchMessage');
  });
});

describe('앱ANR지문', () => {
  it('액티비티 짧은 이름이 제목이고 까닭의 숫자는 틀로 접는다', () => {
    const a = 앱ANR지문('org.joinmastodon.android', 'org.joinmastodon.android/.MainActivity', 'Input dispatching timed out (waited 5001ms)');
    expect(a.title).toBe('ANR · MainActivity');
    expect(앱ANR지문('org.joinmastodon.android', 'org.joinmastodon.android/.MainActivity', 'Input dispatching timed out (waited 5300ms)').fingerprint).toBe(a.fingerprint);
    expect(앱ANR지문('org.joinmastodon.android', null, 'x').title).toBe('ANR · org.joinmastodon.android');
  });
});

describe('게임예외지문', () => {
  const 스택 = [
    'Unity.BossRoom.Gameplay.ClientCharacter.OnAnimEvent (System.String id) [0x00012] in <abc>:0',
    'UnityEngine.Animator.FireEvent () (at Assets/Engine.cs:10)',
    'Unity.BossRoom.Gameplay.AnimHub.Relay () (at Assets/Hub.cs:20)',
  ].join('\n');

  it('엔진 프레임을 빼고 네임스페이스 뺀 클래스.메서드로 묶는다', () => {
    const a = 게임예외지문('NullReferenceException: Object reference not set to an instance of an object', 스택);
    expect(a.title).toBe('NullReferenceException · ClientCharacter.OnAnimEvent');
    expect(게임예외지문('NullReferenceException: 다른 메시지', 스택.replace('0x00012', '0x00099').replace(':20', ':21')).fingerprint).toBe(a.fingerprint);
    expect(게임예외지문('ArgumentException: x', 스택).fingerprint).not.toBe(a.fingerprint);
  });

  it('`:` 가 없는 메시지도 값만 다르면 같은 지문이다', () => {
    expect(게임예외지문('Index 17 out of range', 스택).fingerprint).toBe(게임예외지문('Index 23 out of range', 스택).fingerprint);
  });
});

describe('게임단계', () => {
  const 단계 = [
    { seq: 1, startedAt: '2026-11-12T03:00:00Z' },
    { seq: 2, startedAt: '2026-11-12T03:00:10Z' },
    { seq: 3, startedAt: '2026-11-12T03:00:20Z' },
  ];

  it('오류 시각 이상인 마지막 단계를 고른다', () => {
    expect(게임단계('2026-11-12T03:00:15Z', 단계)).toBe(2);
    expect(게임단계('2026-11-12T03:00:20Z', 단계)).toBe(3);
  });

  it('시각이 없거나 첫 단계보다 앞서면 null 이다', () => {
    expect(게임단계(null, 단계)).toBeNull();
    expect(게임단계('2026-11-12T02:59:00Z', 단계)).toBeNull();
    expect(게임단계('2026-11-12T03:00:15Z', [{ seq: 1, startedAt: null }])).toBeNull();
  });
});
