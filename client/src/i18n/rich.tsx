import { Fragment, type ReactNode } from 'react';

/**
 * A translated sentence with elements inside it: `<0>…</0>` in the text is
 * drawn by the first renderer, `<1>…</1>` by the second, so each language
 * places the link or emphasis where its sentence needs it.
 *
 *   rich(t('On the <0>Account page</0> you can…'), [(c) => <Link to="/account">{c}</Link>])
 */
export function rich(
  text: string,
  renderers: Array<(children: ReactNode) => ReactNode>,
): ReactNode {
  const out: ReactNode[] = [];
  const pattern = /<(\d+)>(.*?)<\/\1>/gs;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const render = renderers[Number(match[1])];
    out.push(<Fragment key={index}>{render ? render(match[2]) : match[2]}</Fragment>);
    last = index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 && typeof out[0] === 'string' ? out[0] : out;
}
