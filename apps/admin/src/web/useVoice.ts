// Scout 입력의 🎤 — Web Speech API 로 들은 말을 입력 칸에 채우기만 한다. 보내기는 사람이 한다 (도메인/챗봇 §8.18 「입력」)
// Chrome 은 소리를 Google 서버로 보내 글자로 바꾼다(알고 쓴다). 못 쓰는 브라우저(Firefox 등)는 쓸수 가 false 라 화면이 🎤 를 숨긴다

import { useEffect, useRef, useState } from 'react';

import type { 언어 } from './i18n.js';

// DOM 타입 묶음에 아직 없다 — 쓰는 만큼만 적는다
interface 들은결과 {
  readonly length: number;
  readonly [i: number]: { readonly transcript: string };
}
interface 인식기 {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { readonly results: { readonly length: number; readonly [i: number]: 들은결과 } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type 인식기틀 = new () => 인식기;

function 인식기찾기(): 인식기틀 | null {
  const w = window as unknown as { SpeechRecognition?: 인식기틀; webkitSpeechRecognition?: 인식기틀 };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** 들은 말을 쓰던 글 뒤에 잇는다. 입력 칸 상한을 넘기지 않는다 */
export function 이어붙이기(앞글: string, 들은: string, 최대: number): string {
  const 앞 = 앞글.trimEnd();
  return (앞 === '' ? 들은.trim() : `${앞} ${들은.trim()}`).slice(0, 최대);
}

export function use음성(언어: 언어, 받기: (글: string) => void) {
  const [틀] = useState(인식기찾기);
  const [듣는중, set듣는중] = useState(false);
  const 귀 = useRef<인식기 | null>(null);

  // 창을 닫거나 화면을 떠나면 마이크를 놓는다
  useEffect(() => () => 귀.current?.abort(), []);

  const 시작 = (앞글: string, 최대: number) => {
    if (틀 === null || 귀.current !== null) return;
    const r = new 틀();
    r.lang = 언어 === 'en' ? 'en-US' : 'ko-KR';
    // 말하는 동안 글자가 바로 보여야 「확인 후 보내세요」 가 뜻이 선다. 말을 그치면 스스로 멈춘다
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let 들은 = '';
      for (let i = 0; i < e.results.length; i += 1) 들은 += e.results[i]![0]?.transcript ?? '';
      받기(이어붙이기(앞글, 들은, 최대));
    };
    // 마이크를 막았거나 말이 없으면 오류로 끝난다 — 듣는 표시를 거두고 쓴 글은 그대로 둔다
    r.onend = r.onerror = () => {
      if (귀.current === r) 귀.current = null;
      set듣는중(false);
    };
    귀.current = r;
    set듣는중(true);
    r.start();
  };

  const 끝 = () => 귀.current?.stop();

  return { 쓸수: 틀 !== null, 듣는중, 시작, 끝 };
}
