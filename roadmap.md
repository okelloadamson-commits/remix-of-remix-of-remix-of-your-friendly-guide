# Roadmap

- [x] Add secure R2 file upload option to every admin media field without changing existing links.
- [x] Implement multipart retry/resume, mobile progress, speed and status; retry/resume tests passed.
- [x] Play directly uploaded videos with Mux while preserving Google Drive playback and subscription checks; browser playback verified with WebM on mobile/desktop.
- [ ] Connect and verify real R2 uploads and Firebase save/read-back (blocked: private upload token not saved, no Firebase admin session, and bucket CORS unverified).
- [ ] Verify H.264 MP4 playback on an equipped browser (blocked: sandbox Chromium rejected the H.264 test codec; WebM playback passed).

- [x] Restore and verify the original embedded download navigation restrictions without reloading the frame; desktop/mobile regression checks passed.

- [x] Restore Download Anyway for confirmed blank embedded pages; verify frame stability and a nonempty test download.
- [ ] Detect blank Google Drive pages when cross-origin access is blocked (blocked: Google Drive does not expose its embedded page state to the website).

- [x] Prevent premature subscription removal and update Active at the saved expiry.
- [x] Test subscription boundary, timestamp handling, and account preservation.
- [ ] Verify the signed-in admin subscriber flow (blocked: no Firebase admin session available).

- [x] Tighten and center the mobile phone, Agent, and Advert controls without overflow.
- [x] Remove the Upload Luo Champion admin card and the Luo Champion checkbox from movie uploads only.
- [x] Add Greeting Advert access to the desktop sidebar.
- [x] Add paid Greetings to the admin dashboard and route.
- [x] Verify successful payments save once and appear in admin Greetings; failed payments do not save.
- [x] Verify mobile and desktop layouts and current build health.
