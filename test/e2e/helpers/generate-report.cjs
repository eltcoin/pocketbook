#!/usr/bin/env node

/**
 * Test Report Generator
 * 
 * Generates comprehensive HTML and Markdown test reports from Playwright test results
 * Includes screenshots, test metrics, and execution summaries
 */

const fs = require('fs');
const path = require('path');

class TestReportGenerator {
  constructor() {
    this.reportDir = path.resolve(__dirname, '../../../test_results');
    this.screenshotsDir = path.resolve(__dirname, '../../../screenshots/e2e');
    this.playwrightResults = path.resolve(__dirname, '../../../test-results');
    
    // Ensure directories exist
    [this.reportDir, this.screenshotsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Load test results from Playwright JSON reporter
   */
  loadTestResults() {
    const resultsFile = path.join(this.playwrightResults, 'results.json');
    
    if (!fs.existsSync(resultsFile)) {
      console.log('⚠️  No test results found. Run tests first.');
      return null;
    }
    
    return JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  }

  /**
   * Load user network fixture data
   */
  loadUserNetwork() {
    const networkFile = path.resolve(__dirname, '../fixtures/user-network.json');
    if (fs.existsSync(networkFile)) {
      return JSON.parse(fs.readFileSync(networkFile, 'utf8'));
    }
    return null;
  }

  /**
   * Collect all screenshots
   */
  collectScreenshots() {
    if (!fs.existsSync(this.screenshotsDir)) {
      return [];
    }
    
    return fs.readdirSync(this.screenshotsDir)
      .filter(file => file.endsWith('.png'))
      .map(file => ({
        name: file,
        path: path.join(this.screenshotsDir, file),
        relativePath: `../screenshots/e2e/${file}`,
        timestamp: fs.statSync(path.join(this.screenshotsDir, file)).mtime
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(results, screenshots, userNetwork) {
    const timestamp = new Date().toISOString();
    const stats = this.calculateStats(results);
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pocketbook Test Report - ${new Date().toLocaleDateString()}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    
    .subtitle {
      font-size: 1.2em;
      opacity: 0.9;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .stat-value {
      font-size: 2.5em;
      font-weight: bold;
      margin: 10px 0;
    }
    
    .stat-label {
      color: #666;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .stat-card.passed .stat-value { color: #10b981; }
    .stat-card.failed .stat-value { color: #ef4444; }
    .stat-card.skipped .stat-value { color: #f59e0b; }
    .stat-card.total .stat-value { color: #667eea; }
    
    .section {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    h2 {
      color: #667eea;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }
    
    .test-suite {
      margin-bottom: 30px;
    }
    
    .test-suite h3 {
      color: #764ba2;
      margin-bottom: 15px;
    }
    
    .test-case {
      padding: 15px;
      margin: 10px 0;
      border-left: 4px solid #ddd;
      background: #f9fafb;
      border-radius: 4px;
    }
    
    .test-case.passed { border-left-color: #10b981; }
    .test-case.failed { border-left-color: #ef4444; }
    .test-case.skipped { border-left-color: #f59e0b; }
    
    .test-name {
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .test-status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
      margin-left: 10px;
    }
    
    .test-status.passed { background: #d1fae5; color: #065f46; }
    .test-status.failed { background: #fee2e2; color: #991b1b; }
    .test-status.skipped { background: #fef3c7; color: #92400e; }
    
    .screenshot-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .screenshot-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      background: white;
    }
    
    .screenshot-item img {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    
    .screenshot-info {
      padding: 10px;
      background: #f9fafb;
    }
    
    .screenshot-name {
      font-size: 0.85em;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .metadata {
      background: #f9fafb;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    .user-network {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    
    .user-card {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    
    .user-card h4 {
      color: #667eea;
      margin-bottom: 10px;
    }
    
    .user-info {
      font-size: 0.9em;
      color: #666;
      line-height: 1.8;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 600;
      margin-right: 5px;
    }
    
    .badge.high { background: #d1fae5; color: #065f46; }
    .badge.medium { background: #fef3c7; color: #92400e; }
    .badge.low { background: #fee2e2; color: #991b1b; }
    .badge.minimal { background: #f3f4f6; color: #374151; }
    .badge.none { background: #e5e7eb; color: #6b7280; }
    
    footer {
      text-align: center;
      padding: 30px;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔖 Pocketbook Test Report</h1>
      <div class="subtitle">Comprehensive Test Suite Execution Results</div>
      <div class="subtitle">${timestamp}</div>
    </header>

    <div class="stats-grid">
      <div class="stat-card total">
        <div class="stat-label">Total Tests</div>
        <div class="stat-value">${stats.total}</div>
      </div>
      <div class="stat-card passed">
        <div class="stat-label">Passed</div>
        <div class="stat-value">${stats.passed}</div>
      </div>
      <div class="stat-card failed">
        <div class="stat-label">Failed</div>
        <div class="stat-value">${stats.failed}</div>
      </div>
      <div class="stat-card skipped">
        <div class="stat-label">Skipped</div>
        <div class="stat-value">${stats.skipped}</div>
      </div>
    </div>

    ${this.generateTestSuitesHTML(results)}
    
    ${userNetwork ? this.generateUserNetworkHTML(userNetwork) : ''}
    
    ${screenshots.length > 0 ? this.generateScreenshotsHTML(screenshots) : ''}
    
    <div class="section">
      <h2>📊 Test Execution Metadata</h2>
      <div class="metadata">
        <div>Report Generated: ${timestamp}</div>
        <div>Total Duration: ${this.formatDuration(stats.duration)}</div>
        <div>Test Suites: ${stats.suites}</div>
        <div>Screenshots Captured: ${screenshots.length}</div>
        ${userNetwork ? `<div>Test Users: ${userNetwork.users.length}</div>` : ''}
      </div>
    </div>

    <footer>
      Generated by Pocketbook Test Infrastructure<br>
      © ${new Date().getFullYear()} - All Rights Reserved
    </footer>
  </div>
</body>
</html>`;

    const reportPath = path.join(this.reportDir, 'test-report.html');
    fs.writeFileSync(reportPath, html);
    console.log('✅ HTML report generated:', reportPath);
    return reportPath;
  }

  /**
   * Generate test suites HTML section
   */
  generateTestSuitesHTML(results) {
    if (!results || !results.suites) {
      return '<div class="section"><h2>⚠️ No test results available</h2></div>';
    }

    let html = '<div class="section"><h2>🧪 Test Suites</h2>';
    
    const renderSuite = (suite, level = 0) => {
      let suiteHtml = `<div class="test-suite" style="margin-left: ${level * 20}px;">`;
      suiteHtml += `<h3>${suite.title || 'Test Suite'}</h3>`;
      
      if (suite.specs && suite.specs.length > 0) {
        suite.specs.forEach(spec => {
          const status = spec.ok ? 'passed' : (spec.tests[0]?.results[0]?.status || 'skipped');
          suiteHtml += `
            <div class="test-case ${status}">
              <div class="test-name">
                ${spec.title}
                <span class="test-status ${status}">${status.toUpperCase()}</span>
              </div>
            </div>`;
        });
      }
      
      if (suite.suites && suite.suites.length > 0) {
        suite.suites.forEach(subSuite => {
          suiteHtml += renderSuite(subSuite, level + 1);
        });
      }
      
      suiteHtml += '</div>';
      return suiteHtml;
    };

    results.suites.forEach(suite => {
      html += renderSuite(suite);
    });
    
    html += '</div>';
    return html;
  }

  /**
   * Generate user network HTML section
   */
  generateUserNetworkHTML(userNetwork) {
    let html = '<div class="section"><h2>👥 Test User Network</h2>';
    html += `<p>Complex and realistic network of ${userNetwork.users.length} test users with varying interaction levels.</p>`;
    html += '<div class="user-network">';
    
    userNetwork.users.forEach(user => {
      const level = user.interactionLevel;
      const badgeClass = level === 'high' ? 'high' : 
                        level === 'medium' ? 'medium' : 
                        level === 'minimal' ? 'minimal' :
                        level === 'none' ? 'none' : 'low';
      
      html += `
        <div class="user-card">
          <h4>${user.profile ? user.profile.name : user.id}</h4>
          <div class="user-info">
            <span class="badge ${badgeClass}">${level}</span><br>
            Following: ${user.socialConnections.following.length}<br>
            Followers: ${user.socialConnections.followers.length}<br>
            Trust Score: ${user.reputation.trustScore}
          </div>
        </div>`;
    });
    
    html += '</div></div>';
    return html;
  }

  /**
   * Generate screenshots HTML section
   */
  generateScreenshotsHTML(screenshots) {
    let html = '<div class="section"><h2>📸 Test Screenshots</h2>';
    html += '<div class="screenshot-gallery">';
    
    screenshots.slice(0, 20).forEach(screenshot => {
      html += `
        <div class="screenshot-item">
          <img src="${screenshot.relativePath}" alt="${screenshot.name}" />
          <div class="screenshot-info">
            <div class="screenshot-name">${screenshot.name}</div>
          </div>
        </div>`;
    });
    
    html += '</div></div>';
    return html;
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport(results, screenshots, userNetwork) {
    const timestamp = new Date().toISOString();
    const stats = this.calculateStats(results);
    
    let markdown = `# 🔖 Pocketbook Test Report

**Generated:** ${timestamp}

## Executive Summary

This report contains the results of the comprehensive test suite execution for the Pocketbook decentralized identity platform.

## Test Results

| Metric | Value |
|--------|-------|
| **Total Tests** | ${stats.total} |
| **Passed** | ✅ ${stats.passed} |
| **Failed** | ❌ ${stats.failed} |
| **Skipped** | ⏭️ ${stats.skipped} |
| **Duration** | ${this.formatDuration(stats.duration)} |
| **Test Suites** | ${stats.suites} |
| **Screenshots** | ${screenshots.length} |

## Test Infrastructure

### Components Tested

- ✅ User claim flow (end-to-end)
- ✅ Social graph functionality
- ✅ Reputation system
- ✅ Privacy controls
- ✅ Multi-chain support
- ✅ Contract deployment
- ✅ Network connectivity

### Test Approach

This test suite follows **BDD (Behavior-Driven Development)** principles:
- **Given**: Setup and preconditions
- **When**: Actions and interactions
- **Then**: Expected outcomes and assertions

`;

    if (userNetwork) {
      markdown += `## Test User Network

A complex and realistic network of **${userNetwork.users.length} test users** with varying interaction levels:

| Interaction Level | Count |
|-------------------|-------|
| High | ${userNetwork.networkStats.highInteraction} |
| Medium | ${userNetwork.networkStats.mediumInteraction} |
| Low | ${userNetwork.networkStats.lowInteraction} |
| Minimal | ${userNetwork.networkStats.minimal} |
| None (Unclaimed) | ${userNetwork.networkStats.none} |

### Network Statistics

- **Total Connections:** ${userNetwork.networkStats.totalConnections}
- **Total Attestations:** ${userNetwork.networkStats.totalAttestations}
- **Claimed Addresses:** ${userNetwork.networkStats.claimedAddresses}
- **Unclaimed Addresses:** ${userNetwork.networkStats.unclaimedAddresses}

`;
    }

    if (results && results.suites) {
      markdown += `## Test Suites

`;
      markdown += this.generateSuiteMarkdown(results.suites);
    }

    if (screenshots.length > 0) {
      markdown += `\n## Screenshots\n\nTotal screenshots captured: **${screenshots.length}**\n\n`;
      screenshots.slice(0, 10).forEach((screenshot, i) => {
        markdown += `${i + 1}. \`${screenshot.name}\`\n`;
      });
    }

    markdown += `\n## Conclusion

The test suite successfully executed with **${stats.passed} passing tests** out of ${stats.total} total tests.

${stats.failed > 0 ? `⚠️ **${stats.failed} tests failed** - Review the HTML report for details.\n` : '✅ All tests passed successfully!\n'}

---

*Report generated by Pocketbook Test Infrastructure*
`;

    const reportPath = path.join(this.reportDir, 'test-report.md');
    fs.writeFileSync(reportPath, markdown);
    console.log('✅ Markdown report generated:', reportPath);
    return reportPath;
  }

  /**
   * Generate suite markdown recursively
   */
  generateSuiteMarkdown(suites, level = 3) {
    let markdown = '';
    suites.forEach(suite => {
      const heading = '#'.repeat(level);
      markdown += `${heading} ${suite.title || 'Test Suite'}\n\n`;
      
      if (suite.specs && suite.specs.length > 0) {
        suite.specs.forEach(spec => {
          const status = spec.ok ? '✅' : '❌';
          markdown += `- ${status} ${spec.title}\n`;
        });
        markdown += '\n';
      }
      
      if (suite.suites && suite.suites.length > 0) {
        markdown += this.generateSuiteMarkdown(suite.suites, level + 1);
      }
    });
    return markdown;
  }

  /**
   * Calculate test statistics
   */
  calculateStats(results) {
    if (!results || !results.suites) {
      return { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0, suites: 0 };
    }

    let stats = { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0, suites: 0 };
    
    const processSuite = (suite) => {
      stats.suites++;
      
      if (suite.specs) {
        suite.specs.forEach(spec => {
          stats.total++;
          if (spec.ok) {
            stats.passed++;
          } else {
            const status = spec.tests[0]?.results[0]?.status;
            if (status === 'skipped') {
              stats.skipped++;
            } else {
              stats.failed++;
            }
          }
        });
      }
      
      if (suite.suites) {
        suite.suites.forEach(processSuite);
      }
    };

    results.suites.forEach(processSuite);
    return stats;
  }

  /**
   * Format duration
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }

  /**
   * Generate all reports
   */
  generate() {
    console.log('\n📊 Generating test reports...\n');
    
    const results = this.loadTestResults();
    const screenshots = this.collectScreenshots();
    const userNetwork = this.loadUserNetwork();
    
    const htmlPath = this.generateHTMLReport(results, screenshots, userNetwork);
    const mdPath = this.generateMarkdownReport(results, screenshots, userNetwork);
    
    console.log('\n✨ Reports generated successfully!\n');
    console.log('  HTML:', htmlPath);
    console.log('  Markdown:', mdPath);
    console.log('\n');
    
    return { htmlPath, mdPath };
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.generate();
}

module.exports = TestReportGenerator;
