import { toast } from "@davidnet-net/svelte-ui";

// Shared by every Community Games docs page's "Copy for AI" button - writes the page's (or the
// full doc's) markdown to the clipboard so it can be pasted directly into an AI assistant.
export async function copyDocsForAi(markdown: string, label = "This page"): Promise<void> {
	try {
		await navigator.clipboard.writeText(markdown);
		toast("Copied", `${label} is ready to paste into an AI assistant.`, "content_copy", 3000, "success");
	} catch (err) {
		console.error("[copyDocsForAi]: clipboard write failed", err);
		toast("Could not copy", "Your browser blocked clipboard access.", "error", 4000, "danger");
	}
}
