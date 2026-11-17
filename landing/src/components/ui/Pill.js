import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Magnetic from "../motion/Magnetic";

const VARIANT = {
  ink: "",
  ghost: "btn-ghost",
  light: "btn-light",
  "ghost-light": "btn-ghost-light",
};

/**
 * The one button of the site: a magnetic pill whose fill rises on hover.
 * Internal paths use next/link; anything else is a plain anchor
 * (external links open in a new tab).
 */
export default function Pill({ href, children, variant = "ink", size, arrow = true, icon, className = "", ...rest }) {
  const internal = href?.startsWith("/");
  const external = href && !internal && !href.startsWith("#");
  const cls = `btn-pill ${VARIANT[variant] || ""} ${size === "sm" ? "btn-sm" : ""} ${className}`;
  const content = (
    <>
      {icon}
      <span>{children}</span>
      {arrow && <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />}
    </>
  );

  return (
    <Magnetic>
      {internal ? (
        <Link href={href} className={cls} {...rest}>
          {content}
        </Link>
      ) : (
        <a href={href} className={cls} {...(external && { target: "_blank", rel: "noopener noreferrer" })} {...rest}>
          {content}
        </a>
      )}
    </Magnetic>
  );
}
