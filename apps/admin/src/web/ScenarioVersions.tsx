// E2E 시나리오 조립 화면의 「변경 이력」 탭 — 버전 목록 · 옛 버전의 단계 요약 · 그 버전으로 되돌리기 (도메인/시나리오 §8.11)

import { useState } from 'react';

import { use말, use언어 } from './i18n.js';
import { scenarioApi, type ScenarioDetail } from './scenarioApi.js';
import { 카드요약, 종류글, type 재료들 } from './scenarioView.js';
import { Failed, Loading, message, useAsync, when } from './ui.js';

type 버전들 = ScenarioDetail['versions'];

// 옛 버전을 열 때 케이스 재료를 새로 부르지 않는다. 지금 조립 화면이 들고 있는 재료만 쓰고 없으면 tcId 만 보인다
function 옛버전단계들({ id, 버전, 재료 }: { id: number; 버전: number; 재료: 재료들 }) {
  const t = use말();
  const 언어 = use언어();
  const { data, error } = useAsync(() => scenarioApi.version(id, 버전), [id, 버전]);
  if (error !== null) return <Failed error={error} />;
  if (data === null) return <Loading />;
  return (
    <ol className="scn-ver-steps" aria-label={t('v{버전} 단계', { 버전 })}>
      {data.parts.map((p, i) => {
        const 값 = p.kind === 'case' ? 재료.get(p.tcId) : undefined;
        const 내용 =
          p.kind !== 'case'
            ? 카드요약(p, undefined, 언어)
            : 값 == null
              ? p.tcId
              : `${p.tcId} ${값.name} · ${카드요약(p, 값, 언어)}`;
        return (
          <li key={i}>
            <span className="scn-ver-no">{i + 1}</span>
            <span className="tech-tag">{t(종류글[p.kind])}</span>
            <span>{내용}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ScenarioVersions({
  id,
  버전들,
  재료,
  쓰나,
  바뀜,
  on되돌림,
}: {
  id: number;
  버전들: 버전들;
  재료: 재료들;
  쓰나: boolean;
  바뀜: boolean;
  on되돌림: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [펼침, set펼침] = useState<number | null>(null);
  const [글, set글] = useState<{ 뜻: 'status' | 'alert'; 말: string } | null>(null);
  const [도는중, set도는중] = useState(false);

  async function 되돌리기(버전: number) {
    if (바뀜) {
      set글({ 뜻: 'alert', 말: t('저장 안 된 변경이 있어 되돌릴 수 없습니다') });
      return;
    }
    set도는중(true);
    set글({ 뜻: 'status', 말: t('되돌리는 중입니다') });
    try {
      const { version } = await scenarioApi.restore(id, 버전);
      set펼침(null);
      set글({ 뜻: 'status', 말: t('v{옛} 내용으로 되돌렸습니다 · 지금 v{새}', { 옛: 버전, 새: version }) });
      on되돌림();
    } catch (err) {
      set글({ 뜻: 'alert', 말: message(err, 언어) });
    } finally {
      set도는중(false);
    }
  }

  return (
    <div className="scn-ver">
      {글 === null ? null : (
        <p className="scn-note" role={글.뜻}>
          {글.말}
        </p>
      )}
      <ul className="scn-ver-list">
        {버전들.map((v, i) => {
          const 줄글 = t('v{버전} · {이름} · {시각}', { 버전: v.version, 이름: v.savedByName, 시각: when(v.savedAt, 언어) });
          if (i === 0) {
            return (
              <li key={v.version} className="scn-ver-row">
                <span>{줄글}</span> <span className="tech-tag">{t('지금 버전')}</span>
              </li>
            );
          }
          const 열림 = 펼침 === v.version;
          return (
            <li key={v.version} className="scn-ver-row">
              <button
                type="button"
                className="scn-ver-open"
                aria-expanded={열림}
                onClick={() => set펼침(열림 ? null : v.version)}
              >
                {줄글}
              </button>
              {!열림 ? null : (
                <>
                  <옛버전단계들 id={id} 버전={v.version} 재료={재료} />
                  {!쓰나 ? null : (
                    <button type="button" className="btn" disabled={도는중} onClick={() => void 되돌리기(v.version)}>
                      {t('이 버전으로 되돌리기')}
                    </button>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
