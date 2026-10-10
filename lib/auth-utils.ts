/**
 * Utility functions for authentication, safe URL redirection, and route protection.
 */

/**
 * Validates whether a redirect path is internal and safe to prevent open redirect vulnerabilities.
 * Disallows external URLs, protocols, protocol-relative paths ('//'), and invalid strings.
 */
export function getSafeInternalRedirect(target?: string | null, fallback = '/dashboard'): string {
  if (!target || typeof target !== 'string') {
    return fallback;
  }

  const trimmed = target.trim();

  // Must begin with a single '/' and not '//', and must not contain URI scheme
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !trimmed.includes('://')
  ) {
    return trimmed;
  }

  return fallback;
}
