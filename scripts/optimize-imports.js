#!/usr/bin/env node

/**
 * Import Optimizer
 * 
 * Analyzes and optimizes import statements to:
 * - Use tree-shakable imports where possible
 * - Identify heavy imports that could be lazy-loaded
 * - Suggest lighter alternatives
 */

const fs = require('fs');
const path = require('path');

class ImportOptimizer {
  constructor() {
    this.heavyLibraries = {
      'framer-motion': {
        suggestion: 'Use dynamic imports or lazy loading for animations',
        treeShakable: true,
        alternatives: ['react-spring (lighter)', 'CSS animations']
      },
      'chart.js': {
        suggestion: 'Use dynamic imports for charts',
        treeShakable: false,
        alternatives: ['recharts (already installed)', 'lightweight chart libraries']
      },
      'react-chartjs-2': {
        suggestion: 'Use dynamic imports for charts',
        treeShakable: false,
        alternatives: ['recharts (already installed)']
      },
      'recharts': {
        suggestion: 'Use dynamic imports for charts',
        treeShakable: true,
        alternatives: ['lightweight chart libraries']
      },
      'firebase': {
        suggestion: 'Import only needed modules, use dynamic imports',
        treeShakable: true,
        alternatives: ['Supabase (lighter)', 'individual Firebase modules']
      },
      'date-fns': {
        suggestion: 'Use date-fns/esm for tree shaking',
        treeShakable: true,
        alternatives: ['dayjs (lighter)']
      }
    };

    this.optimizableImports = {
      'date-fns': {
        pattern: /import\s+{\s*([^}]+)\s*}\s+from\s+['"]date-fns['"]/g,
        replacement: (match, imports) => {
          const importList = imports.split(',').map(imp => imp.trim());
          return importList.map(imp => `import ${imp} from 'date-fns/esm/${imp}';`).join('\n');
        }
      },
      'framer-motion': {
        pattern: /import\s+{\s*([^}]+)\s*}\s+from\s+['"]framer-motion['"]/g,
        replacement: (match, imports) => {
          return `// Consider lazy loading: const { ${imports} } = await import('framer-motion');\n${match}`;
        }
      }
    };
  }

  // Find all source files
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

  // Analyze imports in a file
  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = this.extractImports(content);
      const issues = [];

      for (const imp of imports) {
        const library = imp.library;
        
        if (this.heavyLibraries[library]) {
          const info = this.heavyLibraries[library];
          issues.push({
            file: filePath,
            library,
            line: imp.line,
            type: 'heavy_import',
            suggestion: info.suggestion,
            alternatives: info.alternatives,
            treeShakable: info.treeShakable
          });
        }

        // Check for non-tree-shakable imports
        if (imp.isDefaultImport && this.heavyLibraries[library]?.treeShakable) {
          issues.push({
            file: filePath,
            library,
            line: imp.line,
            type: 'non_tree_shakable',
            suggestion: 'Use named imports for better tree shaking'
          });
        }
      }

      return issues;
    } catch (error) {
      return [];
    }
  }

  // Extract import statements from file content
  extractImports(content) {
    const imports = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Match various import patterns
      const patterns = [
        /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/,  // default import
        /import\s+{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]/,  // named imports
        /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/,  // namespace import
        /import\s+['"]([^'"]+)['"]/,  // side effect import
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          imports.push({
            line: index + 1,
            fullMatch: match[0],
            library: match[2] || match[1],
            imports: match[1],
            isDefaultImport: !line.includes('{') && !line.includes('*'),
            isNamedImport: line.includes('{'),
            isNamespaceImport: line.includes('*'),
            isSideEffectImport: !match[2]
          });
          break;
        }
      }
    });

    return imports;
  }

  // Generate optimization suggestions
  generateOptimizations(issues) {
    const suggestions = {
      heavyImports: [],
      treeShaking: [],
      lazyLoading: [],
      alternatives: []
    };

    const libraryGroups = {};
    
    // Group issues by library
    issues.forEach(issue => {
      if (!libraryGroups[issue.library]) {
        libraryGroups[issue.library] = [];
      }
      libraryGroups[issue.library].push(issue);
    });

    // Generate suggestions for each library
    Object.entries(libraryGroups).forEach(([library, libIssues]) => {
      const fileCount = new Set(libIssues.map(i => i.file)).size;
      
      if (libIssues.some(i => i.type === 'heavy_import')) {
        suggestions.heavyImports.push({
          library,
          fileCount,
          suggestion: `Consider lazy loading ${library} (used in ${fileCount} files)`,
          files: [...new Set(libIssues.map(i => i.file))]
        });
      }

      if (libIssues.some(i => i.type === 'non_tree_shakable')) {
        suggestions.treeShaking.push({
          library,
          fileCount,
          suggestion: `Use named imports for ${library} to enable tree shaking`
        });
      }

      // Suggest lazy loading for heavy libraries
      if (['framer-motion', 'chart.js', 'recharts', 'firebase'].includes(library)) {
        suggestions.lazyLoading.push({
          library,
          fileCount,
          suggestion: `Implement dynamic imports for ${library}`,
          example: `const ${library.replace('-', '')} = await import('${library}');`
        });
      }

      // Suggest alternatives
      const info = this.heavyLibraries[library];
      if (info?.alternatives) {
        suggestions.alternatives.push({
          library,
          alternatives: info.alternatives,
          fileCount
        });
      }
    });

    return suggestions;
  }

  // Generate comprehensive report
  generateReport() {
    console.log('🔍 Analyzing imports...\n');

    const sourceFiles = this.getAllSourceFiles();
    const allIssues = [];

    for (const file of sourceFiles) {
      const issues = this.analyzeFile(file);
      allIssues.push(...issues);
    }

    const optimizations = this.generateOptimizations(allIssues);

    console.log('📊 Import Optimization Report\n');
    console.log('=' .repeat(50));

    // Heavy imports
    if (optimizations.heavyImports.length > 0) {
      console.log('\n⚠️  Heavy Imports Found:');
      optimizations.heavyImports.forEach(item => {
        console.log(`   • ${item.library}: ${item.suggestion}`);
        console.log(`     Files: ${item.fileCount}`);
      });
    }

    // Tree shaking opportunities
    if (optimizations.treeShaking.length > 0) {
      console.log('\n🌳 Tree Shaking Opportunities:');
      optimizations.treeShaking.forEach(item => {
        console.log(`   • ${item.suggestion}`);
      });
    }

    // Lazy loading suggestions
    if (optimizations.lazyLoading.length > 0) {
      console.log('\n⏳ Lazy Loading Suggestions:');
      optimizations.lazyLoading.forEach(item => {
        console.log(`   • ${item.suggestion}`);
        console.log(`     Example: ${item.example}`);
      });
    }

    // Alternative libraries
    if (optimizations.alternatives.length > 0) {
      console.log('\n🔄 Alternative Libraries:');
      optimizations.alternatives.forEach(item => {
        console.log(`   • ${item.library}: Consider ${item.alternatives.join(', ')}`);
      });
    }

    // Summary
    console.log('\n📈 Summary:');
    console.log(`   Files analyzed: ${sourceFiles.length}`);
    console.log(`   Issues found: ${allIssues.length}`);
    console.log(`   Heavy imports: ${optimizations.heavyImports.length}`);
    console.log(`   Tree shaking opportunities: ${optimizations.treeShaking.length}`);

    return {
      filesAnalyzed: sourceFiles.length,
      issues: allIssues,
      optimizations
    };
  }
}

// Run if called directly
if (require.main === module) {
  const optimizer = new ImportOptimizer();
  optimizer.generateReport();
}

module.exports = ImportOptimizer;
