# Video ads

The Journey and Fun loading screens, plus the Sambisa matchmaking placement, accept **real IAB VAST linear-video tags**. They do not display fabricated ads or count impressions without video playback.

1. Obtain a VAST tag from an ad provider with rights to serve ads in this app.
2. Replace the empty `vastTagUrl` in `index.html`:

   ```html
   <script>window.AERORANK_AD_CONFIG = { vastTagUrl: "https://your-ad-server.example/vast?placement=game" };</script>
   ```

3. Serve the site over HTTPS. Your provider must permit browser CORS access to the VAST XML (including wrappers) and provide MP4 or WebM media that the browser can play.
4. Test a real creative and its impression/start/quartile/complete/click tracking with the provider before launch. The app fires impression and start only when playback begins; it never fires them for an unavailable creative. An unavailable ad shows **No ad available**, with no fake delay or fake sponsor.

`src/lib/ads.ts` parses InLine ads and up to three wrappers. It does not replace a full ad SDK for OMID verification, ad auctions, SIMID, consent management or server-side monetization. Add your provider's approved SDK if those are contractually required. The app has no payout backend; on-screen prize values and simulated opponents are not proof of real cash eligibility.