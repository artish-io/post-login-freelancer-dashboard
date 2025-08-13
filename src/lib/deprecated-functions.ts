/**
 * Deprecated Functions - Build-time Errors
 * 
 * This file provides build-time errors for deprecated functions to prevent their usage.
 * Import this file in any module that should not use deprecated functions.
 */

/**
 * Build-time error for readAllProjects usage
 * @deprecated Use UnifiedStorageService.listProjects(...) instead of readAllProjects
 */
export function readAllProjects(): never {
  throw new Error(
    'readAllProjects is deprecated. Use UnifiedStorageService.listProjects(...) instead of readAllProjects.'
  );
}

/**
 * Build-time error for readAllTasks usage  
 * @deprecated Use UnifiedStorageService.listTasks(...) instead of readAllTasks
 */
export function readAllTasks(): never {
  throw new Error(
    'readAllTasks is deprecated. Use UnifiedStorageService.listTasks(...) instead of readAllTasks.'
  );
}

/**
 * Type-level error for deprecated function usage
 */
type DeprecatedFunction = {
  __error: 'This function is deprecated. Use UnifiedStorageService instead.';
};

/**
 * Utility type to mark functions as deprecated at compile time
 */
export type Deprecated<T> = T & DeprecatedFunction;
