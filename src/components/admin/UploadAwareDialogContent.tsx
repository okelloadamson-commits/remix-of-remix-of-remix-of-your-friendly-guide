import * as React from "react";
import { DialogContent } from "@/components/ui/dialog";
import { subscribeUploadActivity } from "@/lib/upload-activity";

type Props = React.ComponentPropsWithoutRef<typeof DialogContent>;

// Dialog body that refuses to close from a background click or Escape while an
// upload is running. The X icon and any button inside still close normally.
export function UploadAwareDialogContent({
  onInteractOutside,
  onEscapeKeyDown,
  ...props
}: Props) {
  const [active, setActive] = React.useState(false);
  React.useEffect(() => subscribeUploadActivity(setActive), []);
  const guard = (event: Event) => {
    if (!active) return;
    event.preventDefault();
  };
  return (
    <DialogContent
      {...props}
      onInteractOutside={(event) => { guard(event); onInteractOutside?.(event); }}
      onEscapeKeyDown={(event) => { guard(event); onEscapeKeyDown?.(event); }}
    />
  );
}
