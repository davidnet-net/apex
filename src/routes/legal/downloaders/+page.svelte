<script lang="ts">
	import LegalViewer from "$lib/components/LegalViewer.svelte";
	import document from "$lib/legal/downloaders.md?raw";
	const githubpath = "src/lib/legal/downloaders.md";
	const docname = "Downloaders";
</script>

<LegalViewer {document} {githubpath} {docname} />