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

- Download dialogs keep the embedded frame mounted across player updates and use one user-initiated fallback link; callback identity must never restart navigation or trigger duplicate downloads.
