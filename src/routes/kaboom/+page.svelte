<script>
    const urls = [
    "https://example.com/1",
    "https://example.com/2",
    "https://example.com/3",
    "https://example.com/4",
    "https://example.com/5"
    ];

    window.addEventListener("load", () => {
    urls.forEach(url => {
        const newTab = window.open(url, "_blank");
        if (newTab) {
        // Close the tab after 2 seconds
        setTimeout(() => {
            newTab.close();
        }, 2000);
        } else {
        console.log("Blocked by browser:", url);
        }
    });
    });
</script>

<h1>Loading...</h1>
