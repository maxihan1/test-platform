// 설정 프로젝트의 「API 서버」 구획 — 케이스가 부른 호스트에 이름을 붙인다 (SPEC 도메인/인증 §8.8 「프로젝트」)
// 이름은 케이스 목록의 꼬리표가 된다. 직접 주소를 더하는 칸은 없다 — 실행에서 본 호스트만 뜬다

import { useState } from 'react';

import { api } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 오류문장 } from './SettingsService.js';
import { 구획 } from './SettingsServiceParts.js';
import { Failed, Loading, useAsync } from './ui.js';

export function ApiServers({ 프로젝트 }: { 프로젝트: number }) {
  const t = use말();
  const 언어 = use언어();
  const 목록 = useAsync(() => api.projectApiServers(프로젝트), [프로젝트]);
  // 고친 칸만 담는다 — 안 고친 줄은 서버 값 그대로 보이고 보내지도 않는다
  const [고침, set고침] = useState<Record<string, string>>({});
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const 줄들 = 목록.data?.items ?? [];
  const 값 = (host: string, 이름: string | null) => 고침[host] ?? 이름 ?? '';
  const 바뀐 = 줄들.filter((r) => 고침[r.host] !== undefined && 고침[r.host]!.trim() !== (r.name ?? ''));

  async function 저장() {
    set보내는중(true);
    setErr(null);
    try {
      await api.saveProjectApiServers(프로젝트, 바뀐.map((r) => ({ host: r.host, name: 고침[r.host]!.trim() })));
      set고침({});
      await 목록.reload();
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <구획 제목={t('API 서버')} 쓰임={t('케이스가 뒤에서 부른 서버에 이름을 붙이면 케이스 목록에 이름표가 붙습니다. 같은 이름을 여러 주소에 써도 됩니다')}>
      {목록.error !== null ? (
        <Failed error={목록.error} />
      ) : 목록.data === null ? (
        <Loading />
      ) : 줄들.length === 0 ? (
        <p className="hint">{t('케이스를 실행하면 부른 서버가 여기 뜹니다')}</p>
      ) : (
        <>
          {줄들.map((r, i) => (
            <div key={r.host} className="set-row">
              <span className="set-name">{r.host}</span>
              <span className="set-sub">{t('케이스 {수}개', { 수: r.cases })}</span>
              <input
                id={`pf-api-${i}`}
                type="text"
                maxLength={20}
                value={값(r.host, r.name)}
                placeholder={t('이름 없음')}
                aria-label={t('{호스트} 이름', { 호스트: r.host })}
                onChange={(e) => set고침((전) => ({ ...전, [r.host]: e.target.value }))}
              />
            </div>
          ))}
          {err === null ? null : <div className="err">{err}</div>}
          <div className="set-foot">
            <button className="btn" disabled={보내는중 || 바뀐.length === 0} onClick={() => void 저장()}>
              {t('저장')}
            </button>
          </div>
        </>
      )}
    </구획>
  );
}
