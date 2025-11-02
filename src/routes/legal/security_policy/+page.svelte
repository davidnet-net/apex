<script lang="ts">
	import LegalViewer from "$lib/components/LegalViewer.svelte";
	import document from "$lib/legal/security_policy.md?raw";
	const githubpath = "src/lib/legal/security_policy.md";
	const docname = "Security policy";
</script>

<LegalViewer {document} {githubpath} {docname} />