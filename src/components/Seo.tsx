import { useEffect } from "react";
import type { ReactNode, ReactElement } from "react";
import { Children, isValidElement } from "react";

/**
 * Lightweight drop-in replacement for react-helmet-async's <Helmet>.
 * Renders declarative <title>/<meta>/<link>/<script> children imperatively into
 * document.head and cleans them up on unmount. Avoids the helmetInstances
 * context crash in react-helmet-async v2.
 */

type Props = { children?: ReactNode };

const MANAGED_ATTR = "data-karbali-seo";

function applyElement(el: ReactElement): HTMLElement | null {
  const type = el.type as string;
  if (typeof type !== "string") return null;
  const props = (el.props ?? {}) as Record<string, unknown>;

  if (type === "title") {
    const text = Children.toArray(props.children as ReactNode).join("");
    document.title = text;
    return null;
  }

  const node = document.createElement(type);
  node.setAttribute(MANAGED_ATTR, "");
  for (const [key, value] of Object.entries(props)) {
    if (key === "children" || value == null) continue;
    if (key === "className") node.setAttribute("class", String(value));
    else node.setAttribute(key, String(value));
  }
  const children = props.children;
  if (typeof children === "string" || typeof children === "number") {
    node.textContent = String(children);
  } else if (Array.isArray(children)) {
    node.textContent = children.filter((c) => typeof c === "string" || typeof c === "number").join("");
  }
  document.head.appendChild(node);
  return node;
}

export function Helmet({ children }: Props) {
  const key = JSON.stringify(
    Children.toArray(children).map((c) => (isValidElement(c) ? [c.type, c.props] : c)),
  );

  useEffect(() => {
    const created: HTMLElement[] = [];
    const previousTitle = document.title;

    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      const node = applyElement(child as ReactElement);
      if (node) created.push(node);
    });

    return () => {
      created.forEach((n) => n.remove());
      document.title = previousTitle;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

/** No-op provider kept so existing app shell code stays unchanged. */
export function HelmetProvider({ children }: Props) {
  return <>{children}</>;
}

export default Helmet;
