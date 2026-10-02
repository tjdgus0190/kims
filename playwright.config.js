// QA 자동 테스트 설정: 임시 데이터 폴더로 서버를 띄워 실제 브라우저(PC/모바일)로 검사합니다.
const { defineConfig, devices } = require('@playwright/test');
const os = require('os');
const path = require('path');

const PORT = 3456;
const tmp = path.join(os.tmpdir(), 'jncosu-test-' + process.pid);
const chromium = process.env.PLAYWRIGHT_CHROMIUM_PATH || (require('fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: chromium ? { executablePath: chromium } : {},
  },
  projects: [
    { name: 'pc', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `node -e "require('fs').rmSync('${tmp}',{recursive:true,force:true})" && node server.js`,
    port: PORT,
    reuseExistingServer: false,
    env: { PORT: String(PORT), ADMIN_PASSWORD: 'test-pass', DATA_DIR: tmp, UPLOAD_DIR: path.join(tmp, 'uploads') },
  },
});
