import { ViewTransition } from "react";

/**
 * Re-mounts on every navigation, so React's <ViewTransition> runs the page
 * exit/enter animation (".page" in globals.css). Needs
 * experimental.viewTransition in next.config.mjs. Browsers without the View
 * Transitions API simply swap pages instantly.
 */
export default function Template({ children }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      {children}
    </ViewTransition>
  );
}
