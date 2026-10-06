// E2E 시나리오 조립 화면 — 머리 · 저장 · 권한 · 떠나기 확인 · 왼쪽 단계 카드와 오른쪽 탭 틀. 탭 속은 다음 할 일이 채운다 (도메인/시나리오 §8.11)

import { useEffect, useRef, useState } from 'react';

import type { ScenarioPart } from '@platform/kit';

import type { ServiceRow, User } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { useBeforeUnload, 떠나기로했다, 떠나기막기 } from './leaveGuard.js';
import { Loading, Failed, PLATFORMS, PLATFORM_LABEL, when } from './ui.js';
import { Modal } from './Modal.js';
import { 판정을만든다 } from './role.js';
import { ScenarioCards } from './ScenarioCards.js';
import { ScenarioLinks } from './ScenarioLinks.js';
import { ScenarioOtherPanel } from './ScenarioOtherPanel.js';
import { ScenarioPartPanel } from './ScenarioPartPanel.js';
import { ScenarioTabs, type 조립탭 } from './ScenarioTabs.js';
import { useScenarioDraft } from './useScenarioDraft.js';

export type { 조립탭 };

export function ScenarioBuild({
  id,
  띠서비스,
  user,
}: {
  id: number | null;
  띠서비스: ServiceRow | null;
  user: User;
}) {
  const t = use말();
  const 언어 = use언어();
  const 초안 = useScenarioDraft(id, 띠서비스?.prefix ?? null);
  const 판정 = 판정을만든다(user, 초안.서비스);
  const 쓰나 = 판정('실행') && 초안.살아있나;
  // 새 시나리오는 단계를 넣는 일이 먼저라 추가 탭부터 연다
  const [탭, set탭] = useState<조립탭>(id === null ? 'add' : 'settings');
  const [고른번호, set고른번호] = useState<number | null>(null);
  // 케이스 바꾸기를 눌러 추가 탭으로 넘어간 단계 번호. 추가 탭의 바꾸기 모드가 읽는다
  const [바꿀번호, set바꿀번호] = useState<number | null>(null);
  const 처음고름 = useRef(false);
  const [떠날곳, set떠날곳] = useState<string | null>(null);
  const [저장글, set저장글] = useState<string | null>(null);
  const 막나 = 쓰나 && 초안.바뀜;
  const 보낼곳 = id === null && !판정('실행');

  useEffect(() => {
    // 읽기만 하는 사람이 주소로 연 새 화면은 쓸 데가 없다
    if (보낼곳) window.location.hash = '#/scenarios';
  }, [보낼곳]);

  useEffect(() => {
    // 불러온 시나리오는 첫 단계를 열어 두어 설정 탭이 바로 보이게 한다. 한 번만 — 나중에 고른 카드를 뺀 뒤 되돌리지 않는다
    if (id === null || !초안.불러옴 || 처음고름.current) return;
    처음고름.current = true;
    if (초안.단계들.length > 0) set고른번호(1);
  }, [id, 초안.불러옴, 초안.단계들.length]);

  useEffect(() => {
    if (!막나) return;
    떠나기막기((갈곳) => set떠날곳(갈곳));
    return () => 떠나기막기(null);
  }, [막나]);
  useBeforeUnload(막나);

  if (보낼곳) return null;
  if (초안.오류 !== null) return <Failed error={초안.오류} />;
  if (!초안.불러옴) return <Loading />;

  async function 저장누름() {
    set저장글(null);
    const 결과 = await 초안.저장();
    if (결과 === null) return;
    if (id === null) {
      // 자기 이동에 떠나기 상자를 띄우지 않는다
      떠나기막기(null);
      window.location.hash = `#/scenarios/${결과.id}`;
      return;
    }
    set저장글(t('저장했습니다 · v{버전}', { 버전: 결과.version }));
  }

  const 고른단계 = 고른번호 === null ? undefined : 초안.단계들[고른번호 - 1];
  function 고른단계바꿈(새단계: ScenarioPart) {
    초안.단계들바꾸기(초안.단계들.map((p, i) => (i === (고른번호 ?? 0) - 1 ? 새단계 : p)));
  }
  const 최신 = 초안.버전들[0];
  const 서비스이름 = user.services.find((s) => s.prefix === 초안.서비스)?.name ?? 초안.서비스;
  const 상태글 = 초안.저장오류 ?? 저장글;

  const 부제 = (
    <>
      <input
        type="text"
        className="scn-name-input"
        aria-label={t('시나리오 이름')}
        placeholder={t('시나리오 이름')}
        value={초안.이름}
        readOnly={!쓰나}
        onChange={(e) => {
          if (쓰나) 초안.set이름(e.target.value);
        }}
      />
      {최신 === undefined ? null : (
        <span>
          {t('v{버전} · {이름} 저장 · {시각}', {
            버전: 최신.version,
            이름: 최신.savedByName,
            시각: when(최신.savedAt, 언어),
          })}
        </span>
      )}
      {!초안.바뀜 ? null : <span className="case-tag">{t('저장 안 된 변경 있음')}</span>}
    </>
  );

  const 행동 = (
    <>
      <select
        aria-label={t('디바이스')}
        value={초안.디바이스}
        disabled={!쓰나}
        onChange={(e) => 초안.set디바이스(e.target.value === 'mobile' ? 'mobile' : 'desktop')}
      >
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>
            {t(PLATFORM_LABEL[p])}
          </option>
        ))}
      </select>
      {!쓰나 || id === null ? null : (
        <button type="button" className="btn ghost" onClick={() => set탭('history')}>
          {t('변경 이력')}
        </button>
      )}
      {!쓰나 ? null : (
        <button type="button" className="btn" disabled={초안.저장하는중} onClick={() => void 저장누름()}>
          {초안.저장하는중 ? t('저장하는 중') : t('저장')}
        </button>
      )}
    </>
  );

  return (
    <>
      <div className="scn-back">
        <a href="#/scenarios">{t('← 목록')}</a>
      </div>
      <Head 제목={id === null ? t('새 시나리오') : `SC-${id}`} 부제={부제} 행동={행동} />

      <div className="screen scn-screen">
        {상태글 === null ? null : (
          <p className="scn-note" role="status">
            {상태글}
          </p>
        )}
        {판정('실행') ? null : <p className="scn-note">{t('실행 권한이 있어야 고치고 돌릴 수 있습니다')}</p>}
        {초안.살아있나 ? null : <p className="scn-note">{t('목록에서 치운 시나리오라 보기만 할 수 있습니다')}</p>}
        {띠서비스 === null || 띠서비스.prefix === 초안.서비스 ? null : (
          <p className="scn-note">{t('이 시나리오는 {서비스} 서비스 것입니다', { 서비스: 서비스이름 })}</p>
        )}

        {/* 바꾸기 모드가 아직 없어 바꿀 번호는 화면 속성으로만 읽힌다 */}
        <div className="scn-build" data-tab={탭} data-swap={바꿀번호 ?? undefined}>
          <section className="scn-build-list" aria-label={t('시나리오 단계')}>
            <ScenarioCards
              단계들={초안.단계들}
              단계들바꾸기={초안.단계들바꾸기}
              재료={초안.재료}
              디바이스={초안.디바이스}
              쓰나={쓰나}
              고른번호={고른번호}
              on고르기={set고른번호}
              on탭={set탭}
            />
          </section>
          <section className="scn-build-panel" aria-label={t('단계 추가 · 설정')}>
            <ScenarioTabs 탭={탭} on탭={set탭} 고른번호={고른번호} 쓰나={쓰나} 이력있나={id !== null}>
              {탭 !== 'settings' || 고른번호 === null || 고른단계 === undefined ? null : 고른단계.kind === 'case' ? (
                <ScenarioPartPanel
                  번호={고른번호}
                  단계={고른단계}
                  단계들={초안.단계들}
                  재료={초안.재료}
                  쓰나={쓰나}
                  on바꿈={고른단계바꿈}
                  on케이스바꾸기={() => {
                    set바꿀번호(고른번호);
                    set탭('add');
                  }}
                  값연결={
                    <ScenarioLinks
                      번호={고른번호}
                      단계={고른단계}
                      단계들={초안.단계들}
                      재료={초안.재료}
                      쓰나={쓰나}
                      on바꿈={(links) => 고른단계바꿈({ ...고른단계, links })}
                    />
                  }
                />
              ) : (
                <ScenarioOtherPanel
                  번호={고른번호}
                  단계={고른단계}
                  단계들={초안.단계들}
                  쓰나={쓰나}
                  on바꿈={고른단계바꿈}
                />
              )}
            </ScenarioTabs>
          </section>
        </div>
      </div>

      {떠날곳 === null ? null : (
        <Modal
          제목={t('저장 안 된 변경 있음')}
          onClose={() => set떠날곳(null)}
          버튼={
            <>
              <button type="button" className="btn" onClick={() => set떠날곳(null)}>
                {t('머무르기')}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  떠나기로했다();
                  window.location.hash = 떠날곳;
                }}
              >
                {t('저장하지 않고 떠나기')}
              </button>
            </>
          }
        >
          {t('이 화면을 떠나면 저장하지 않은 내용이 사라집니다')}
        </Modal>
      )}
    </>
  );
}
