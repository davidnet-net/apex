<script lang="ts">
	import LegalViewer from "$lib/components/LegalViewer.svelte";
	import document from "$lib/legal/terms_of_service.md?raw";
	const githubpath = "src/lib/legal/terms_of_service.md";
	const docname = "Terms of Service";
</script>

<LegalViewer {document} {githubpath} {docname} />