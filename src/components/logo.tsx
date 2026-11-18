import Link from "next/link";
import { LogoLockup } from "@/components/logo-mark";
import { APP_NAME } from "@/lib/brand";

/** The radstrat logo (cat + lettering), linking home. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo-link flex min-h-11 items-center text-white" aria-label={`${APP_NAME} home`}>
      <LogoLockup className="h-9 w-auto sm:h-10" />
    </Link>
  );
}
