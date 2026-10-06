<script>
	import { AppShell } from "@davidnet-net/svelte-ui";
	import { PUBLIC_BACKEND_URL } from "$env/static/public";

	import * as paraglideRuntime from "$lib/paraglide/runtime.js";

	let { children } = $props();

	// The backend's ipBanGuard middleware blocks every single route (including this one) with a
	// 403 IP_BANNED for a banned address - this is the one place that checks for that and bounces
	// the visitor to a dedicated page instead of leaving every page on the site looking broken.
	$effect(() => {
		(async () => {
			if (window.location.pathname === "/moderation/ip-banned") return;

			try {
				const res = await fetch(`${PUBLIC_BACKEND_URL}/health`);
				if (res.status === 403) {
					const body = await res.json().catch(() => null);
					if (body?.code === "IP_BANNED") {
						window.location.href = "/moderation/ip-banned";
					}
				}
			} catch {
				// Network/health hiccups shouldn't lock anyone out - fail open.
			}
		})();
	});
</script>

<AppShell appName="Davidnet" shortAppName="DN" {paraglideRuntime}>
	{#snippet banners()}
		<!--<Banner appearance="warning" icon="frame_source">Davidnet development mode active!</Banner>-->
	{/snippet}
	{@render children()}
</AppShell>
