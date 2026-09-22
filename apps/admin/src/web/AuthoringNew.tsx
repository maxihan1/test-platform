// 기획서를 넣어 작성을 요청하는 폼 (도메인/작성 §3.6 · §7 POST /api/authoring/requests)
//
// **경로가 아니라 본문을 보낸다.** 맥은 다른 기계라 이 서버의 파일 경로를 못 읽고,
// 그 파일이 나중에 고쳐지면 무엇을 시킨 요청이었는지도 같이 바뀐다 (공통/4-데이터모델 §6)

import { useState } from 'react';

import { api } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

export function AuthoringNew({ service, on넣었다 }: { service: string; on넣었다: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [기획서, set기획서] = useState('');
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);

  const 빈것 = 기획서.trim() === '';

  async function 보낸다() {
    // 빈 기획서로 줄을 세우면 맥이 집어 가서 아무것도 못 하고 실패로 끝난다
    if (빈것 || 보내는중) return;
    set보내는중(true);
    set오류(null);
    try {
      await api.createAuthoringRequest(service, { kind: 'AUTHOR', specText: 기획서 });
      set기획서('');
      on넣었다();
    } catch (err) {
      set오류(message(err, 언어));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <form
      className="toolbar authoring-new"
      onSubmit={(e) => {
        e.preventDefault();
        void 보낸다();
      }}
    >
      <textarea
        placeholder={t('기획서 본문을 붙여 넣으세요')}
        value={기획서}
        rows={4}
        onChange={(e) => set기획서(e.target.value)}
      />
      <button className="btn" type="submit" disabled={빈것 || 보내는중}>
        {보내는중 ? t('보내는 중') : t('보내기')}
      </button>
      {오류 === null ? null : <span className="error-text">{오류}</span>}
    </form>
  );
}
