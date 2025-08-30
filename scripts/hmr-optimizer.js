#!/usr/bin/env node

/**
 * HMR Optimizer
 * 
 * Optimizes Hot Module Replacement configuration and monitors
 * HMR performance to reduce unnecessary recompilations.
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

class HMROptimizer {
  constructor() {
    this.watchedFiles = new Set();
    this.recompilationCount = 0;
    this.lastRecompilation = 0;
    this.startTime = Date.now();
    
    // Files that should trigger full recompilation
    this.criticalFiles = new Set([
      'next.config.js',
      'tailwind.config.js',
      'tsconfig.json',
      'package.json'
    ]);

    // Files that should be ignored for HMR
    this.ignoredPatterns = [
      /node_modules/,
      /\.git/,
      /\.next/,
      /data\/.*\.json$/,
      /uploads/,
      /public/,
      /\.env/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
      /\.md$/,
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /coverage/,
      /dist/,
      /build/
    ];
  }

  /**
   * Check if file should be ignored for HMR
   */
  shouldIgnoreFile(filePath) {
    return this.ignoredPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if file is critical and requires full recompilation
   */
  isCriticalFile(filePath) {
    const fileName = path.basename(filePath);
    return this.criticalFiles.has(fileName);
  }

  /**
   * Analyze file change patterns
   */
  analyzeFileChanges() {
    const projectRoot = process.cwd();
    const srcDirs = ['src', 'components', 'lib', 'hooks', 'utils', 'pages', 'app'];
    
    const stats = {
      totalFiles: 0,
      watchedFiles: 0,
      ignoredFiles: 0,
      criticalFiles: 0,
      dataFiles: 0
    };

    for (const dir of srcDirs) {
      const dirPath = path.join(projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        this.analyzeDirectory(dirPath, stats);
      }
    }

    return stats;
  }

  analyzeDirectory(dirPath, stats) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.analyzeDirectory(fullPath, stats);
      } else {
        stats.totalFiles++;
        
        if (this.shouldIgnoreFile(fullPath)) {
          stats.ignoredFiles++;
        } else if (this.isCriticalFile(fullPath)) {
          stats.criticalFiles++;
        } else if (fullPath.includes('/data/') && fullPath.endsWith('.json')) {
          stats.dataFiles++;
        } else {
          stats.watchedFiles++;
        }
      }
    }
  }

  /**
   * Monitor HMR performance
   */
  startMonitoring() {
    console.log('🔥 Starting HMR performance monitoring...');
    
    const watcher = chokidar.watch('.', {
      ignored: this.ignoredPatterns,
      ignoreInitial: true,
      persistent: true
    });

    watcher.on('change', (filePath) => {
      this.recompilationCount++;
      this.lastRecompilation = Date.now();
      
      const isCritical = this.isCriticalFile(filePath);
      const changeType = isCritical ? 'CRITICAL' : 'NORMAL';
      
      console.log(`🔄 [${changeType}] File changed: ${filePath}`);
      
      if (isCritical) {
        console.log('⚠️  Critical file changed - full recompilation required');
      }
    });

    watcher.on('add', (filePath) => {
      console.log(`➕ File added: ${filePath}`);
    });

    watcher.on('unlink', (filePath) => {
      console.log(`➖ File removed: ${filePath}`);
    });

    // Performance reporting
    setInterval(() => {
      this.reportPerformance();
    }, 30000); // Report every 30 seconds

    return watcher;
  }

  /**
   * Report HMR performance metrics
   */
  reportPerformance() {
    const runtime = Date.now() - this.startTime;
    const runtimeMinutes = Math.round(runtime / 1000 / 60);
    const avgRecompilationsPerMinute = this.recompilationCount / (runtimeMinutes || 1);
    
    console.log('\n📊 HMR Performance Report:');
    console.log(`   Runtime: ${runtimeMinutes} minutes`);
    console.log(`   Total recompilations: ${this.recompilationCount}`);
    console.log(`   Avg recompilations/min: ${avgRecompilationsPerMinute.toFixed(1)}`);
    
    if (avgRecompilationsPerMinute > 5) {
      console.log('⚠️  High recompilation frequency detected!');
      this.suggestOptimizations();
    }
    
    if (this.lastRecompilation > 0) {
      const timeSinceLastChange = Date.now() - this.lastRecompilation;
      console.log(`   Time since last change: ${Math.round(timeSinceLastChange / 1000)}s`);
    }
  }

  /**
   * Suggest HMR optimizations
   */
  suggestOptimizations() {
    console.log('\n💡 HMR Optimization Suggestions:');
    console.log('   1. Check if data files are being watched unnecessarily');
    console.log('   2. Exclude test files from file watching');
    console.log('   3. Use .env.local for environment variables');
    console.log('   4. Consider using React.memo for expensive components');
    console.log('   5. Avoid importing large libraries in component files');
    console.log('   6. Use dynamic imports for heavy components');
  }

  /**
   * Generate HMR configuration recommendations
   */
  generateConfig() {
    const stats = this.analyzeFileChanges();
    
    console.log('\n📋 HMR Configuration Analysis:');
    console.log(`   Total files: ${stats.totalFiles}`);
    console.log(`   Watched files: ${stats.watchedFiles}`);
    console.log(`   Ignored files: ${stats.ignoredFiles}`);
    console.log(`   Critical files: ${stats.criticalFiles}`);
    console.log(`   Data files: ${stats.dataFiles}`);
    
    const watchEfficiency = (stats.watchedFiles / stats.totalFiles) * 100;
    console.log(`   Watch efficiency: ${watchEfficiency.toFixed(1)}%`);
    
    if (stats.dataFiles > 100) {
      console.log('⚠️  Large number of data files detected');
      console.log('   Consider excluding data directory from file watching');
    }
    
    if (watchEfficiency < 50) {
      console.log('✅ Good file watching efficiency');
    } else {
      console.log('⚠️  Consider excluding more files from watching');
    }

    return {
      stats,
      recommendations: this.getRecommendations(stats)
    };
  }

  getRecommendations(stats) {
    const recommendations = [];
    
    if (stats.dataFiles > 50) {
      recommendations.push('Exclude data directory from file watching');
    }
    
    if (stats.totalFiles > 1000) {
      recommendations.push('Consider using more specific watch patterns');
    }
    
    if (stats.watchedFiles / stats.totalFiles > 0.7) {
      recommendations.push('Add more file patterns to ignore list');
    }
    
    return recommendations;
  }

  /**
   * Optimize webpack watch options
   */
  optimizeWatchOptions() {
    const configPath = path.join(process.cwd(), 'next.config.js');
    
    if (!fs.existsSync(configPath)) {
      console.log('❌ next.config.js not found');
      return;
    }

    console.log('🔧 Analyzing webpack watch configuration...');
    
    const config = require(configPath);
    const hasWatchOptions = config.webpack && 
      typeof config.webpack === 'function';
    
    if (hasWatchOptions) {
      console.log('✅ Webpack watch options already configured');
    } else {
      console.log('⚠️  Consider adding webpack watch options to next.config.js');
      this.suggestWatchConfig();
    }
  }

  suggestWatchConfig() {
    console.log('\n💡 Suggested webpack watch configuration:');
    console.log(`
webpack: (config, { dev }) => {
  if (dev) {
    config.watchOptions = {
      ignored: [
        '**/node_modules/**',
        '**/data/**/*.json',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
        '**/scripts/**',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.spec.{js,jsx,ts,tsx}',
        '**/__tests__/**',
        '**/README.md',
        '**/*.md',
        '**/docs/**',
      ],
      aggregateTimeout: 300,
      poll: false,
    };
  }
  return config;
}
    `);
  }
}

// CLI interface
if (require.main === module) {
  const optimizer = new HMROptimizer();
  const command = process.argv[2];

  switch (command) {
    case 'monitor':
      optimizer.startMonitoring();
      break;
    case 'analyze':
      optimizer.generateConfig();
      break;
    case 'optimize':
      optimizer.optimizeWatchOptions();
      break;
    default:
      console.log('HMR Optimizer Commands:');
      console.log('  monitor  - Start HMR performance monitoring');
      console.log('  analyze  - Analyze file watching patterns');
      console.log('  optimize - Check and suggest webpack optimizations');
      break;
  }
}

module.exports = HMROptimizer;
