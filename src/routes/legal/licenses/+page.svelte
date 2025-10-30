<script lang="ts">
	import LegalViewer from "$lib/components/LegalViewer.svelte";
	import document from "$lib/legal/licenses.md?raw";
	const githubpath = "src/lib/legal/licenses.md";
	const docname = "Licenses";
</script>

<LegalViewer {document} {githubpath} {docname} />