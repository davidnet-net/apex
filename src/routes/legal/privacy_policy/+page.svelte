<script lang="ts">
	import LegalViewer from "$lib/components/LegalViewer.svelte";
	import document from "$lib/legal/privacy_policy.md?raw";
	const githubpath = "src/lib/legal/privacy_policy.md";
	const docname = "Privacy Policy";
</script>

<LegalViewer {document} {githubpath} {docname} />