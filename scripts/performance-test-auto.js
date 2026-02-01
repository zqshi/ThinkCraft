#!/usr/bin/env node

/**
 * 自动化性能测试脚本
 * 使用Puppeteer测量页面性能指标
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 性能测试配置
const TEST_URL = 'http://localhost:8000';
const TEST_SCENARIOS = [
  {
    name: '首次访问（无缓存）',
    cache: false,
    network: 'Fast3G'
  },
  {
    name: '回访用户（有缓存）',
    cache: true,
    network: 'Fast3G'
  },
  {
    name: '弱网环境（Slow3G）',
    cache: false,
    network: 'Slow3G'
  }
];

// 网络配置
const NETWORK_PRESETS = {
  'Fast3G': {
    offline: false,
    downloadThroughput: 1.6 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
    latency: 40
  },
  'Slow3G': {
    offline: false,
    downloadThroughput: 500 * 1024 / 8,
    uploadThroughput: 500 * 1024 / 8,
    latency: 400
  }
};

/**
 * 运行性能测试
 */
async function runPerformanceTest(scenario) {
  console.log(`\n🧪 测试场景: ${scenario.name}`);
  console.log('━'.repeat(60));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // 设置网络条件
    const client = await page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', NETWORK_PRESETS[scenario.network]);

    // 清除缓存（如果需要）
    if (!scenario.cache) {
      await client.send('Network.clearBrowserCache');
      await client.send('Network.clearBrowserCookies');
    }

    // 启用性能监控
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = {
        navigationStart: 0,
        domContentLoaded: 0,
        loadComplete: 0,
        firstPaint: 0,
        firstContentfulPaint: 0
      };

      // 监听性能事件
      window.addEventListener('DOMContentLoaded', () => {
        window.performanceMetrics.domContentLoaded = performance.now();
      });

      window.addEventListener('load', () => {
        window.performanceMetrics.loadComplete = performance.now();

        // 获取Paint Timing
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          if (entry.name === 'first-paint') {
            window.performanceMetrics.firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            window.performanceMetrics.firstContentfulPaint = entry.startTime;
          }
        });
      });
    });

    // 记录开始时间
    const startTime = Date.now();

    // 导航到页面
    await page.goto(TEST_URL, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 等待页面完全加载
    await page.waitForTimeout(2000);

    // 获取性能指标
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');

      let firstPaint = 0;
      let firstContentfulPaint = 0;

      paintEntries.forEach(entry => {
        if (entry.name === 'first-paint') {
          firstPaint = entry.startTime;
        } else if (entry.name === 'first-contentful-paint') {
          firstContentfulPaint = entry.startTime;
        }
      });

      return {
        // 导航时间
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        domInteractive: perf.domInteractive - perf.fetchStart,

        // Paint时间
        firstPaint: firstPaint,
        firstContentfulPaint: firstContentfulPaint,

        // 资源加载
        dnsLookup: perf.domainLookupEnd - perf.domainLookupStart,
        tcpConnection: perf.connectEnd - perf.connectStart,
        requestTime: perf.responseEnd - perf.requestStart,
        responseTime: perf.responseEnd - perf.responseStart,

        // 总时间
        totalTime: perf.loadEventEnd - perf.fetchStart
      };
    });

    // 获取资源统计
    const resourceStats = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');

      const stats = {
        total: resources.length,
        js: 0,
        css: 0,
        img: 0,
        other: 0,
        totalSize: 0,
        jsSize: 0,
        cssSize: 0,
        imgSize: 0
      };

      resources.forEach(resource => {
        const type = resource.initiatorType;
        const size = resource.transferSize || 0;

        stats.totalSize += size;

        if (type === 'script') {
          stats.js++;
          stats.jsSize += size;
        } else if (type === 'link' || type === 'css') {
          stats.css++;
          stats.cssSize += size;
        } else if (type === 'img') {
          stats.img++;
          stats.imgSize += size;
        } else {
          stats.other++;
        }
      });

      return stats;
    });

    // 计算总耗时
    const totalDuration = Date.now() - startTime;

    // 输出结果
    console.log('\n📊 性能指标:');
    console.log(`  首次绘制 (FP): ${metrics.firstPaint.toFixed(0)}ms`);
    console.log(`  首次内容绘制 (FCP): ${metrics.firstContentfulPaint.toFixed(0)}ms`);
    console.log(`  DOM可交互: ${metrics.domInteractive.toFixed(0)}ms`);
    console.log(`  DOMContentLoaded: ${metrics.domContentLoaded.toFixed(0)}ms`);
    console.log(`  页面加载完成: ${metrics.loadComplete.toFixed(0)}ms`);
    console.log(`  总耗时: ${totalDuration}ms`);

    console.log('\n📦 资源统计:');
    console.log(`  总请求数: ${resourceStats.total}`);
    console.log(`  JavaScript: ${resourceStats.js}个 (${(resourceStats.jsSize / 1024).toFixed(1)}KB)`);
    console.log(`  CSS: ${resourceStats.css}个 (${(resourceStats.cssSize / 1024).toFixed(1)}KB)`);
    console.log(`  图片: ${resourceStats.img}个 (${(resourceStats.imgSize / 1024).toFixed(1)}KB)`);
    console.log(`  其他: ${resourceStats.other}个`);
    console.log(`  总传输大小: ${(resourceStats.totalSize / 1024).toFixed(1)}KB`);

    console.log('\n🌐 网络时间:');
    console.log(`  DNS查询: ${metrics.dnsLookup.toFixed(0)}ms`);
    console.log(`  TCP连接: ${metrics.tcpConnection.toFixed(0)}ms`);
    console.log(`  请求时间: ${metrics.requestTime.toFixed(0)}ms`);
    console.log(`  响应时间: ${metrics.responseTime.toFixed(0)}ms`);

    // 评分
    console.log('\n⭐ 性能评分:');
    const scores = {
      fcp: metrics.firstContentfulPaint < 1800 ? '优秀' : metrics.firstContentfulPaint < 3000 ? '良好' : '需改进',
      domInteractive: metrics.domInteractive < 2000 ? '优秀' : metrics.domInteractive < 3500 ? '良好' : '需改进',
      totalTime: metrics.totalTime < 3000 ? '优秀' : metrics.totalTime < 5000 ? '良好' : '需改进',
      jsSize: resourceStats.jsSize < 200 * 1024 ? '优秀' : resourceStats.jsSize < 400 * 1024 ? '良好' : '需改进'
    };

    console.log(`  首次内容绘制: ${scores.fcp}`);
    console.log(`  DOM可交互: ${scores.domInteractive}`);
    console.log(`  总加载时间: ${scores.totalTime}`);
    console.log(`  JS文件大小: ${scores.jsSize}`);

    return {
      scenario: scenario.name,
      metrics,
      resourceStats,
      totalDuration,
      scores
    };

  } finally {
    await browser.close();
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 ThinkCraft 性能测试');
  console.log('━'.repeat(60));
  console.log(`测试URL: ${TEST_URL}`);
  console.log(`测试场景数: ${TEST_SCENARIOS.length}`);

  const results = [];

  for (const scenario of TEST_SCENARIOS) {
    try {
      const result = await runPerformanceTest(scenario);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ 测试失败: ${scenario.name}`);
      console.error(error.message);
    }
  }

  // 生成对比报告
  console.log('\n\n📈 性能对比总结');
  console.log('━'.repeat(60));

  console.log('\n| 场景 | FCP | DOM可交互 | 总耗时 | JS大小 |');
  console.log('|------|-----|-----------|--------|--------|');

  results.forEach(result => {
    console.log(`| ${result.scenario} | ${result.metrics.firstContentfulPaint.toFixed(0)}ms | ${result.metrics.domInteractive.toFixed(0)}ms | ${result.totalDuration}ms | ${(result.resourceStats.jsSize / 1024).toFixed(1)}KB |`);
  });

  // 保存结果到文件
  const reportPath = path.join(__dirname, '../docs/performance-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ 测试结果已保存到: ${reportPath}`);

  console.log('\n✨ 测试完成！');
}

// 检查Puppeteer是否安装
try {
  require.resolve('puppeteer');
  main().catch(error => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });
} catch (e) {
  console.log('❌ 错误: 未安装 Puppeteer');
  console.log('\n请先安装 Puppeteer:');
  console.log('  npm install --save-dev puppeteer');
  console.log('\n或使用手动测试方法:');
  console.log('  1. 访问 http://localhost:8000');
  console.log('  2. 打开 Chrome DevTools (F12)');
  console.log('  3. 切换到 Performance 标签');
  console.log('  4. 点击 Record 并刷新页面');
  process.exit(1);
}
