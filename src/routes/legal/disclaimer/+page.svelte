<script lang="ts">
	import LegalViewer from "$lib/components/LegalViewer.svelte";
	import document from "$lib/legal/disclaimer.md?raw";
	const githubpath = "src/lib/legal/disclaimer.md";
	const docname = "Disclaimer";
</script>

<LegalViewer {document} {githubpath} {docname} />