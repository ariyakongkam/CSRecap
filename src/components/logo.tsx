import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { APP_NAME } from "@/lib/brand";

/** Logo mark + wordmark, linking home. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2 font-display text-2xl font-bold tracking-tight" aria-label={`${APP_NAME} home`}>
      <LogoMark className="h-8 w-10" />
      <span>{APP_NAME}</span>
    </Link>
  );
}
