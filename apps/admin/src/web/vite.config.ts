import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // 루트를 이 파일 위치로 못 박는다. 저장소 어디서 실행해도 같은 곳을 본다
  root: here,
  plugins: [react()],
  // app.ts가 src/web/dist를 정적 서빙한다 (WORKSTREAMS 공용 골격). 산출물 자리를 바꾸면 서빙이 끊긴다
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5173,
    // 개발 중에도 API는 진짜 admin이 받는다. 목 데이터를 두지 않는다.
    // '/api'로 적으면 소스 파일 /api.ts 요청까지 admin으로 넘어가 404가 된다. ^로 시작하면 정규식이다.
    //
    // 기본은 컨테이너의 3000이다. 컨테이너가 낡은 이미지를 물고 있을 때
    // 소스에서 띄운 admin 을 대신 보게 하려고 환경변수를 받는다 —
    // PLATFORM_ADMIN_URL=http://localhost:3200 npx vite --config ...
    proxy: { '^/api/': process.env.PLATFORM_ADMIN_URL ?? 'http://localhost:3000' },
  },
});
