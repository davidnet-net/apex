<script lang="ts">
	import LegalViewer from "$lib/components/HelpViewer.svelte";
	import document from "$lib/help/contact.md?raw";
	const githubpath = "src/lib/help/contact.md";
	const docname = "Contact Information";
</script>

<LegalViewer {document} {githubpath} {docname} />