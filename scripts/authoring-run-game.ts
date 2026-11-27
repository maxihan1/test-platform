// 게임 작성의 가린 뒤 준비 — 코드 저장소 받기와 빌드 zip 에서 게임 데이터 꺼내기를 나란히 돌린다 (authoring-run 이 300줄을 넘어 떼어 냈다)
import { type 받은저장소, 코드저장소받기 } from './authoring-code-repos.js';
import { type 꺼내기입력, 게임빌드데이터꺼내기 } from './authoring-game-build-data.js';

/**
 * 먼저가리기 뒤에만 부른다 — 코드 저장소와 빌드 데이터가 자료 폴더 큰 파일을 만들어 가리기가 시간을 쓰지 않게.
 * 둘 다 못 받아도 작성은 간다(빌드 데이터는 못 꺼낸 까닭을 알리고 돌아온다)
 */
export async function 게임가린뒤받기(o: { 코드저장소?: readonly { name: string; url: string }[]; 멈추라했다: () => boolean; 빌드데이터: 꺼내기입력 }): Promise<받은저장소[] | undefined> {
  const [, 코드] = await Promise.all([
    게임빌드데이터꺼내기(o.빌드데이터),
    o.코드저장소 === undefined ? undefined : 코드저장소받기(o.코드저장소, o.빌드데이터.자료, process.env, o.멈추라했다),
  ]);
  return 코드;
}
