/**
 * Firestore doesn't allow undefined values in documents.
 * This utility recursively removes all undefined properties from an object or array.
 */
export function stripUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => stripUndefined(item));
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return obj;
}
