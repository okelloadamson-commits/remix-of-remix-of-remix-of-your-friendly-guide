import { useState } from "react";
import { UserCheck, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";
import { GreetingAdvertModal } from "@/components/greetings/GreetingAdvertModal";


/**
 * Mobile-only bar under the hero slide. Shows the support phone number,
 * a shortcut to the Agent page, and the Greeting button — all stretched to
 * fill the row. Spans exactly the same width as the movie grid below it
 * (same px-4 padding, no max-width) so it never overflows or stops short.
 */
export function SupportCallBar() {
  const [advertOpen, setAdvertOpen] = useState(false);

  return (
    <div className="lg:hidden px-4 py-2">
      <div className="grid w-full grid-cols-2 items-stretch gap-1.5">


        <Link
          to="/agent"
          className="agent-gold-shimmer min-w-0 w-full justify-center gap-1 px-1 py-2 rounded-lg text-xs"
          aria-label="Become an agent"
        >
          <UserCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Agent</span>
        </Link>

        <button
          type="button"
          onClick={() => setAdvertOpen(true)}
          className="flex min-w-0 items-center justify-center gap-1 w-full px-1 py-2 rounded-lg font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-orange-500 active:scale-[0.97] transition-transform"
          aria-label="Send a greeting"
        >
          <Megaphone className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">Greeting</span>
        </button>
      </div>

      <GreetingAdvertModal open={advertOpen} onOpenChange={setAdvertOpen} />
    </div>
  );
}
