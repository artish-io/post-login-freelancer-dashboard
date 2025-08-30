#!/usr/bin/env node

/**
 * Dependency Analyzer
 * 
 * Analyzes package.json dependencies to identify:
 * - Unused dependencies
 * - Heavy dependencies that could be replaced
 * - Duplicate dependencies
 * - Development vs production dependency misplacement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DependencyAnalyzer {
  constructor() {
    this.packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    this.dependencies = this.packageJson.dependencies || {};
    this.devDependencies = this.packageJson.devDependencies || {};
    this.allDeps = { ...this.dependencies, ...this.devDependencies };
  }

  // Find potentially unused dependencies
  findUnusedDependencies() {
    const unused = [];
    const srcFiles = this.getAllSourceFiles();
    
    for (const dep of Object.keys(this.allDeps)) {
      if (this.isLikelyUnused(dep, srcFiles)) {
        unused.push({
          name: dep,
          version: this.allDeps[dep],
          type: this.dependencies[dep] ? 'dependency' : 'devDependency'
        });
      }
    }
    
    return unused;
  }

  getAllSourceFiles() {
    const files = [];
    const searchDirs = ['src', 'components', 'lib', 'hooks', 'utils', 'pages', 'app'];
    
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        files.push(...this.getFilesRecursively(dir));
      }
    }
    
    return files;
  }

  getFilesRecursively(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath));
      } else if (item.match(/\.(js|jsx|ts|tsx)$/)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  isLikelyUnused(depName, sourceFiles) {
    // Skip Next.js and React core dependencies
    const coreFrameworkDeps = [
      'next', 'react', 'react-dom', 'next-auth',
      '@types/react', '@types/react-dom', '@types/node'
    ];
    
    if (coreFrameworkDeps.includes(depName)) {
      return false;
    }

    // Check if dependency is imported in any source file
    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for various import patterns
        const importPatterns = [
          new RegExp(`import.*from\\s+['"]${depName}['"]`, 'g'),
          new RegExp(`import\\s+['"]${depName}['"]`, 'g'),
          new RegExp(`require\\(['"]${depName}['"]\\)`, 'g'),
          new RegExp(`from\\s+['"]${depName}/`, 'g'),
        ];
        
        if (importPatterns.some(pattern => pattern.test(content))) {
          return false;
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
    
    return true;
  }

  // Find heavy dependencies that could be optimized
  findHeavyDependencies() {
    const heavyDeps = [
      // Chart libraries
      { name: 'chart.js', alternatives: ['recharts (already installed)', 'lightweight chart libraries'] },
      { name: 'react-chartjs-2', note: 'Consider if both chart.js and recharts are needed' },
      
      // Date libraries
      { name: 'date-fns', note: 'Good choice, but ensure tree-shaking is working' },
      
      // UI libraries
      { name: 'framer-motion', note: 'Heavy animation library - consider lazy loading' },
      
      // Firebase
      { name: 'firebase', note: 'Very heavy - consider using only needed modules' },
      
      // Utility libraries
      { name: 'lodash', alternatives: ['native JS methods', 'lodash-es for tree-shaking'] },
    ];

    const found = [];
    for (const heavy of heavyDeps) {
      if (this.allDeps[heavy.name]) {
        found.push({
          ...heavy,
          version: this.allDeps[heavy.name],
          type: this.dependencies[heavy.name] ? 'dependency' : 'devDependency'
        });
      }
    }

    return found;
  }

  // Check for misplaced dependencies
  checkDependencyPlacement() {
    const misplaced = [];
    
    // Dev dependencies that should be in dependencies
    const shouldBeInDeps = ['next', 'react', 'react-dom'];
    for (const dep of shouldBeInDeps) {
      if (this.devDependencies[dep]) {
        misplaced.push({
          name: dep,
          issue: 'Should be in dependencies (not devDependencies)',
          current: 'devDependencies',
          suggested: 'dependencies'
        });
      }
    }

    // Dependencies that could be dev dependencies
    const couldBeDevDeps = ['@types/', 'eslint', 'typescript', 'jest'];
    for (const dep of Object.keys(this.dependencies)) {
      if (couldBeDevDeps.some(pattern => dep.includes(pattern))) {
        misplaced.push({
          name: dep,
          issue: 'Could be in devDependencies',
          current: 'dependencies',
          suggested: 'devDependencies'
        });
      }
    }

    return misplaced;
  }

  // Generate optimization suggestions
  generateOptimizations() {
    return {
      bundleSize: [
        'Use dynamic imports for heavy components (framer-motion, charts)',
        'Implement code splitting for routes',
        'Use tree-shaking for date-fns and other utilities',
        'Consider replacing chart.js with lighter alternatives if both are used',
        'Lazy load Firebase modules only when needed'
      ],
      performance: [
        'Move type definitions to devDependencies',
        'Use exact versions for critical dependencies',
        'Consider using CDN for heavy libraries in production',
        'Implement bundle analysis in CI/CD pipeline'
      ],
      maintenance: [
        'Remove unused dependencies to reduce security surface',
        'Update dependencies regularly for security patches',
        'Use npm audit to check for vulnerabilities',
        'Consider using npm-check-updates for dependency updates'
      ]
    };
  }

  // Generate comprehensive report
  generateReport() {
    console.log('🔍 Analyzing dependencies...\n');

    const unused = this.findUnusedDependencies();
    const heavy = this.findHeavyDependencies();
    const misplaced = this.checkDependencyPlacement();
    const optimizations = this.generateOptimizations();

    console.log('📊 Dependency Analysis Report\n');
    console.log('=' .repeat(50));

    // Unused dependencies
    if (unused.length > 0) {
      console.log('\n⚠️  Potentially Unused Dependencies:');
      unused.forEach(dep => {
        console.log(`   • ${dep.name} (${dep.type})`);
      });
      console.log('\n💡 Run: npm uninstall <package-name> to remove');
    } else {
      console.log('\n✅ No obviously unused dependencies found');
    }

    // Heavy dependencies
    if (heavy.length > 0) {
      console.log('\n📦 Heavy Dependencies to Optimize:');
      heavy.forEach(dep => {
        console.log(`   • ${dep.name}: ${dep.note || 'Consider optimization'}`);
        if (dep.alternatives) {
          console.log(`     Alternatives: ${dep.alternatives.join(', ')}`);
        }
      });
    }

    // Misplaced dependencies
    if (misplaced.length > 0) {
      console.log('\n🔄 Dependency Placement Issues:');
      misplaced.forEach(dep => {
        console.log(`   • ${dep.name}: ${dep.issue}`);
      });
    }

    // Optimization suggestions
    console.log('\n💡 Optimization Suggestions:');
    console.log('\n   Bundle Size:');
    optimizations.bundleSize.forEach(suggestion => {
      console.log(`   • ${suggestion}`);
    });

    console.log('\n   Performance:');
    optimizations.performance.forEach(suggestion => {
      console.log(`   • ${suggestion}`);
    });

    console.log('\n   Maintenance:');
    optimizations.maintenance.forEach(suggestion => {
      console.log(`   • ${suggestion}`);
    });

    // Summary
    const totalDeps = Object.keys(this.allDeps).length;
    const potentialSavings = unused.length;
    
    console.log('\n📈 Summary:');
    console.log(`   Total dependencies: ${totalDeps}`);
    console.log(`   Potentially removable: ${potentialSavings}`);
    console.log(`   Heavy dependencies: ${heavy.length}`);
    console.log(`   Placement issues: ${misplaced.length}`);

    return {
      totalDependencies: totalDeps,
      unused,
      heavy,
      misplaced,
      optimizations
    };
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new DependencyAnalyzer();
  analyzer.generateReport();
}

module.exports = DependencyAnalyzer;
