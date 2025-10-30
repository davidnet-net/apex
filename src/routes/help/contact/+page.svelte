<script lang="ts">
	import HelpViewer from "$lib/components/HelpViewer.svelte";
	import document from "$lib/help/contact.md?raw";
	const githubpath = "src/lib/help/contact.md";
	const docname = "Contact Information";
</script>

<HelpViewer {document} {githubpath} {docname} />