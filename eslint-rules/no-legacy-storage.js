/**
 * ESLint Rule: No Legacy Storage Access
 * 
 * Prevents direct access to legacy flat files and enforces hierarchical storage usage
 */

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Disallow direct access to legacy flat files',
      category: 'Best Practices',
      recommended: true
    },
    fixable: 'code',
    schema: []
  },

  create(context) {
    const LEGACY_FILE_PATTERNS = [
      'data/projects.json',
      'data/project-tasks.json',
      'data/invoices.json',
      'data/gigs/gigs.json',
      'data/users.json',
      'data/freelancers.json'
    ];

    const REPLACEMENT_MAP = {
      'data/projects.json': 'readAllProjects() from @/lib/projects-utils',
      'data/project-tasks.json': 'readAllTasks() from @/lib/project-tasks/hierarchical-storage',
      'data/invoices.json': 'getAllInvoices() from @/lib/invoice-storage',
      'data/gigs/gigs.json': 'readAllGigs() from @/lib/gigs/hierarchical-storage',
      'data/users.json': 'readAllUsers() from @/lib/users-utils',
      'data/freelancers.json': 'readAllFreelancers() from @/lib/freelancers-utils'
    };

    function checkForLegacyAccess(node, value) {
      if (typeof value === 'string') {
        const matchedPattern = LEGACY_FILE_PATTERNS.find(pattern => 
          value.includes(pattern) || value.endsWith(pattern)
        );

        if (matchedPattern) {
          const replacement = REPLACEMENT_MAP[matchedPattern];
          
          context.report({
            node,
            message: `Direct access to legacy file '${matchedPattern}' is not allowed. Use ${replacement} instead.`,
            data: {
              file: matchedPattern,
              replacement
            }
          });
        }
      }
    }

    return {
      // Check string literals
      Literal(node) {
        if (typeof node.value === 'string') {
          checkForLegacyAccess(node, node.value);
        }
      },

      // Check template literals
      TemplateLiteral(node) {
        node.quasis.forEach(quasi => {
          if (quasi.value && quasi.value.raw) {
            checkForLegacyAccess(node, quasi.value.raw);
          }
        });
      },

      // Check require/import statements
      ImportDeclaration(node) {
        if (node.source && node.source.value) {
          checkForLegacyAccess(node, node.source.value);
        }
      },

      CallExpression(node) {
        // Check require() calls
        if (node.callee.name === 'require' && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            checkForLegacyAccess(node, arg.value);
          }
        }

        // Check fs.readFile, fs.readFileSync calls
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'fs' &&
          (node.callee.property.name === 'readFile' || 
           node.callee.property.name === 'readFileSync') &&
          node.arguments.length > 0
        ) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            checkForLegacyAccess(node, arg.value);
          }
        }

        // Check path.join calls that might construct legacy paths
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'path' &&
          node.callee.property.name === 'join'
        ) {
          // Reconstruct the path from arguments
          const pathParts = node.arguments
            .filter(arg => arg.type === 'Literal' && typeof arg.value === 'string')
            .map(arg => arg.value);
          
          if (pathParts.length > 0) {
            const constructedPath = pathParts.join('/');
            checkForLegacyAccess(node, constructedPath);
          }
        }
      }
    };
  }
};
