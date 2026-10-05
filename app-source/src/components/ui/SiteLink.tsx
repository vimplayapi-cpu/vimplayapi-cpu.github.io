'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { IS_STATIC } from '@/lib/static-mode';

/** Static hosting has no route server: use ordinary, base-path-aware navigation.
 * The Node application retains Next's client navigation and prefetch behavior.
 */
export default function SiteLink(props: ComponentProps<typeof NextLink>) {
  if (!IS_STATIC || typeof props.href !== 'string') return <NextLink {...props} />;
  const { href, as, replace, scroll, shallow, passHref, prefetch, locale, legacyBehavior, onNavigate, ...anchor } = props;
  const base = process.env.NEXT_PUBLIC_LM_BASE_PATH ?? '';
  const local = href.startsWith('/') && !href.startsWith('//');
  const path = local ? `${base}${href}` : href;
  const resolved = local && !/[.#?]/.test(href) && !path.endsWith('/') ? `${path}/` : path;
  return <a {...anchor} href={resolved} />;
}
