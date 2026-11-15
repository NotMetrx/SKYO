import {defineConfig} from '@playwright/test';
const url=`http://127.0.0.1:${process.env.SKYO_TEST_PORT || 4180}`;
export default defineConfig({
  outputDir:process.env.SKYO_OUTPUT || 'test-results/current',
  testDir:'tests/browser',testMatch:'*.spec.mjs',timeout:90000,workers:1,
  reporter:[['list'],['json',{outputFile:process.env.SKYO_REPORT || 'test-results/browser.json'}]],
  use:{baseURL:url,headless:true,reducedMotion:'reduce',trace:'retain-on-failure',launchOptions:{
    ...(process.env.SKYO_BROWSER?{executablePath:process.env.SKYO_BROWSER}:{}),
    args:['--disable-gpu']
  }},
  webServer:{command:'node tests/browser/server.mjs',url,reuseExistingServer:false}
});
