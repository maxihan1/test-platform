// 기획서 파일과 피그마 주소를 한 세트로 넣어 작성을 요청하는 폼 (도메인/작성 §3.6 · §7 「자료」)
//
// **경로가 아니라 파일 자체를 올린다.** 맥은 다른 기계라 이 서버의 파일 경로를 못 읽는다.
// 앞 판은 같은 이유로 본문을 붙여 넣게 했는데 **기획서가 PDF·워드로 오고 피그마가 같이 와서** 접었다 —
// 글만 붙이면 표와 그림이 빠진다 (2026-09-23, CLAUDE.md §2.7 ②)
//
// 보내기는 세 걸음이다 — 만들기(DRAFT) → 파일마다 올리기 → 줄에 세우기.
// 다 올리기 전에 줄에 서면 맥이 집어 가서 빈 것을 보고 실패한다

import { useState } from 'react';

import { api, ApiError } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

// 서버의 받는 종류와 같다. 값의 정본은 도메인/작성 §7 「자료」 표다
const 받는종류 = '.pdf,.docx,.doc,.md,.txt';

function 받는파일인가(이름: string): boolean {
  const 점 = 이름.lastIndexOf('.');
  return 점 >= 0 && 받는종류.split(',').includes(이름.slice(점).toLowerCase());
}

// 이 폼에서만 만나는 서버 코드. 모르면 공통 번역(message)으로 넘긴다
const 작성오류: Record<string, string> = {
  BAD_FIGMA_URL: '피그마 주소 모양이 다릅니다. 피그마 디자인 파일의 링크를 넣으세요 (FigJam 은 받지 않습니다)',
  BAD_FILE_TYPE: '받지 않는 파일입니다. PDF · 워드 · md · txt 만 받습니다',
  BAD_NAME: '파일 이름에 쓸 수 없는 글자(따옴표 · 빗금 · ..)가 있습니다',
  TOO_MANY_ASSETS: '자료가 한 요청에 넣을 수 있는 개수를 넘었습니다',
  NO_ASSETS: '자료가 하나도 없습니다. 파일이나 피그마 주소를 넣으세요',
  NOT_REQUESTER: '요청한 사람만 자료를 올릴 수 있습니다',
};

export function AuthoringNew({ service, on넣었다 }: { service: string; on넣었다: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [파일들, set파일들] = useState<File[]>([]);
  const [피그마, set피그마] = useState('');
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);

  const 주소들 = 피그마
    .split('\n')
    .map((줄) => 줄.trim())
    .filter((줄) => 줄 !== '');
  const 거절 = 파일들.filter((f) => !받는파일인가(f.name));
  const 빈것 = 파일들.length === 0 && 주소들.length === 0;

  function 사유(err: unknown): string {
    if (err instanceof ApiError && err.status === 413) return t('파일이 한 파일 상한보다 큽니다');
    const 말 = err instanceof ApiError ? 작성오류[err.code] : undefined;
    return 말 === undefined ? message(err, 언어) : t(말);
  }

  async function 보낸다() {
    if (빈것 || 거절.length > 0 || 보내는중) return;
    set보내는중(true);
    set오류(null);
    let id: number;
    try {
      ({ id } = await api.createAuthoringRequest(service, { kind: 'AUTHOR', figma: 주소들 }));
    } catch (err) {
      set오류(사유(err));
      set보내는중(false);
      return;
    }
    // 여기서부터 실패하면 DRAFT 가 남는다. 이어 올리기는 안 만들었다 — 새로 넣으라고만 한다 (§7 「자료」)
    let 지금: File | null = null;
    try {
      for (const 파일 of 파일들) {
        지금 = 파일;
        await api.uploadAuthoringAsset(service, id, 파일);
      }
      지금 = null;
      await api.submitAuthoringRequest(service, id);
    } catch (err) {
      const 어디 = 지금 === null ? 사유(err) : `${지금.name} — ${사유(err)}`;
      set오류(`${t('이 요청은 줄에 서지 않았습니다. 새 요청으로 다시 넣으세요')} (${어디})`);
      set보내는중(false);
      return;
    }
    set파일들([]);
    set피그마('');
    set보내는중(false);
    on넣었다();
  }

  return (
    <form
      className="toolbar authoring-new"
      onSubmit={(e) => {
        e.preventDefault();
        void 보낸다();
      }}
    >
      <label className="authoring-field">
        <span>{t('기획서 파일')}</span>
        <input
          type="file"
          multiple
          accept={받는종류}
          onChange={(e) => set파일들(Array.from(e.target.files ?? []))}
        />
      </label>
      <label className="authoring-field">
        <span>{t('피그마 주소')}</span>
        <textarea
          className="mono"
          placeholder={t('한 줄에 하나씩')}
          value={피그마}
          rows={3}
          onChange={(e) => set피그마(e.target.value)}
        />
      </label>
      <button className="btn" type="submit" disabled={빈것 || 거절.length > 0 || 보내는중}>
        {보내는중 ? t('보내는 중') : t('보내기')}
      </button>
      {거절.length === 0 ? null : (
        <span className="error-text">
          {t('받지 않는 파일입니다. PDF · 워드 · md · txt 만 받습니다')} — {거절.map((f) => f.name).join(' · ')}
        </span>
      )}
      {오류 === null ? null : <span className="error-text">{오류}</span>}
    </form>
  );
}
