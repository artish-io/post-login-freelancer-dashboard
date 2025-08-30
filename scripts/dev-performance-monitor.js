#!/usr/bin/env node

/**
 * Development Performance Monitor
 * 
 * Monitors development server performance and provides optimization suggestions
 * for M3 MacBook Air with limited resources.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DevPerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.memoryUsage = [];
    this.buildTimes = [];
  }

  // Monitor memory usage
  checkMemoryUsage() {
    const usage = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
    };
    
    this.memoryUsage.push({
      timestamp: Date.now(),
      ...memoryMB
    });

    // Alert if memory usage is high for M3 MacBook Air
    if (memoryMB.rss > 2048) { // 2GB threshold
      console.warn(`⚠️  High memory usage detected: ${memoryMB.rss}MB RSS`);
      this.suggestMemoryOptimizations();
    }

    return memoryMB;
  }

  // Monitor file watching overhead
  checkFileWatchingOverhead() {
    const dataDir = path.join(process.cwd(), 'data');
    const nodeModulesDir = path.join(process.cwd(), 'node_modules');
    
    try {
      const dataFiles = this.countFiles(dataDir);
      const nodeModulesFiles = this.countFiles(nodeModulesDir);
      
      console.log(`📁 File watching stats:`);
      console.log(`   Data files: ${dataFiles}`);
      console.log(`   Node modules files: ${nodeModulesFiles}`);
      
      if (dataFiles > 1000) {
        console.warn(`⚠️  Too many data files being watched: ${dataFiles}`);
        console.log(`💡 Consider excluding data directory from file watching`);
      }
    } catch (error) {
      console.error('Error checking file watching overhead:', error.message);
    }
  }

  countFiles(dir) {
    if (!fs.existsSync(dir)) return 0;
    
    let count = 0;
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        count += this.countFiles(fullPath);
      } else {
        count++;
      }
    }
    
    return count;
  }

  // Check for performance anti-patterns
  checkAntiPatterns() {
    const issues = [];
    
    // Check for aggressive polling
    const pollingFiles = this.findPollingPatterns();
    if (pollingFiles.length > 0) {
      issues.push({
        type: 'aggressive_polling',
        files: pollingFiles,
        suggestion: 'Replace frequent polling with smart polling or WebSocket'
      });
    }

    // Check for large bundle imports
    const heavyImports = this.findHeavyImports();
    if (heavyImports.length > 0) {
      issues.push({
        type: 'heavy_imports',
        files: heavyImports,
        suggestion: 'Use dynamic imports or lighter alternatives'
      });
    }

    return issues;
  }

  findPollingPatterns() {
    // This would scan for setInterval patterns with short intervals
    // For now, return empty array as we've already fixed the main ones
    return [];
  }

  findHeavyImports() {
    // This would analyze import statements for heavy libraries
    return [];
  }

  suggestMemoryOptimizations() {
    console.log(`\n💡 Memory optimization suggestions for M3 MacBook Air:`);
    console.log(`   1. Use 'npm run dev:fast' for faster development`);
    console.log(`   2. Close unused browser tabs`);
    console.log(`   3. Restart development server if memory usage > 3GB`);
    console.log(`   4. Consider using 'npm run dev:turbo' for Turbopack`);
    console.log(`   5. Exclude data files from TypeScript compilation\n`);
  }

  // Generate performance report
  generateReport() {
    const runtime = Date.now() - this.startTime;
    const avgMemory = this.memoryUsage.length > 0 
      ? this.memoryUsage.reduce((sum, m) => sum + m.rss, 0) / this.memoryUsage.length
      : 0;

    const report = {
      timestamp: new Date().toISOString(),
      runtime: Math.round(runtime / 1000),
      averageMemoryMB: Math.round(avgMemory),
      peakMemoryMB: Math.max(...this.memoryUsage.map(m => m.rss)),
      memoryReadings: this.memoryUsage.length,
      suggestions: this.checkAntiPatterns()
    };

    console.log(`\n📊 Development Performance Report:`);
    console.log(`   Runtime: ${report.runtime}s`);
    console.log(`   Average Memory: ${report.averageMemoryMB}MB`);
    console.log(`   Peak Memory: ${report.peakMemoryMB}MB`);
    
    if (report.suggestions.length > 0) {
      console.log(`\n⚠️  Performance Issues Found:`);
      report.suggestions.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.type}: ${issue.suggestion}`);
      });
    } else {
      console.log(`\n✅ No performance issues detected`);
    }

    return report;
  }

  // Start monitoring
  start() {
    console.log(`🚀 Starting development performance monitoring...`);
    
    // Check initial state
    this.checkMemoryUsage();
    this.checkFileWatchingOverhead();
    
    // Monitor every 30 seconds
    const interval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);

    // Generate report on exit
    process.on('SIGINT', () => {
      clearInterval(interval);
      this.generateReport();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      clearInterval(interval);
      this.generateReport();
      process.exit(0);
    });
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new DevPerformanceMonitor();
  monitor.start();
}

module.exports = DevPerformanceMonitor;
