<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Subscription status reads use the shared timestamp normalizer and exact expiry predicate; never write deactivation during reads, because stale browser reads can revoke a renewed plan.
- Admin subscriber lists listen to Firestore and key accounts by Firebase UID; listing accounts must never deduplicate by email or delete records.
- Expiry-sensitive views use the subscription clock to update without requiring a Firebase write or page reload.
- Gift revocation uses a transaction and only clears the current gift plan; a replacement paid plan must remain untouched.

- Download dialogs keep the embedded frame mounted across player updates; callback identity must never restart navigation or trigger duplicate downloads. Show the fallback inside the frame area only for a confirmed blank document; unreadable cross-origin pages and elapsed time are not proof of blankness.
- Keep the original desktop/mobile click shields over the embedded provider's filename and surrounding links; they preserve the provider's own download control without accessing its cross-origin document, but depend on the provider's layout.
- R2 signing requests verify Firebase admin identity server-side and keep the shared upload token in private storage; page visibility is not credential protection.
- Direct media upload fields preserve URL/Drive inputs, checkpoint multipart ETags in IndexedDB, and retry only unconfirmed parts; after a browser restart the original file must be reselected.
- Mux playback handles direct media only inside existing subscription gates; Google Drive embeds remain unchanged. Public R2 URLs are not DRM or server-protected playback.
- Direct video downloads bypass the dialog after existing access and limit checks; public R2 downloads stream through an attachment endpoint restricted to public R2 hosts, avoiding whole-file browser buffering and leaving Drive unchanged.
