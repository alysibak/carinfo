/**
 * URLs in a message or stack without their query or fragment, which may carry
 * password-reset or unsubscribe tokens; a stack frame keeps its line and
 * column ("a.js?v=2:1:200" becomes "a.js:1:200").
 */
export function withoutQueries(text: string): string {
  return text.replace(
    /((?:https?:\/\/|\/)[^\s?#()]*)[?#][^\s()]*?((?::\d+){1,2})?(?=[\s()]|$)/g,
    '$1$2',
  );
}
