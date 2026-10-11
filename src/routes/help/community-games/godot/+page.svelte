<script lang="ts">
	import { Button, CodeSnippet, Flex, LinkButton, navigateBack } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	import { godot as godotDocs } from "$lib/content/communityGamesDocs";
	import { copyDocsForAi } from "$lib/utils/copyDocsForAi";

	const bridge = `extends Node

# --- Davidnet SDK bridge for Godot HTML5 exports ---
# Deliberately NOT built on JavaScriptBridge.create_callback() for responses - it turned out
# unreliable in practice (a call's callback could silently never fire even though the request
# genuinely succeeded). Polling via JavaScriptBridge.eval()'s return value instead: eval() is a
# plain synchronous call/return, nothing gets "wired up" that can silently fail to be.
signal sdk_ready

var _web_capable := false
var _sdk_ready := false
var _next_request_id := 0

func _ready() -> void:
	_web_capable = OS.has_feature("web")
	if not _web_capable:
		push_warning("DavidnetSDK bridge: not running in the HTML5 export - SDK calls will be no-ops.")
		return

	JavaScriptBridge.eval("""
		window.__dnPending = {};

		window.__dnStart = function(method, argsJson, requestId) {
			var args = JSON.parse(argsJson);
			var path = method.split(".");
			var target = window.DavidnetSDK;
			for (var i = 0; i < path.length - 1; i++) target = target[path[i]];
			var fn = target[path[path.length - 1]];
			Promise.resolve(fn.apply(target, args)).then(function(result) {
				window.__dnPending[requestId] = {
					success: true,
					data: JSON.stringify(result === undefined ? null : result)
				};
			}).catch(function(err) {
				window.__dnPending[requestId] = {
					success: false,
					data: String(err && err.message ? err.message : err)
				};
			});
		};

		window.__dnPoll = function(requestId) {
			var entry = window.__dnPending[requestId];
			if (!entry) return "";
			delete window.__dnPending[requestId];
			return JSON.stringify(entry);
		};
	""", true)

	_sdk_ready = true
	sdk_ready.emit()


# Calls any window.DavidnetSDK method - use a dot-path for nested ones, e.g. "realtime.send".
# on_success receives a parsed Dictionary/Array/primitive, on_error receives an error String.
# Polls once per frame for up to 11s - plenty responsive for a real ~30-40ms round trip, and safe
# to call from anywhere (including a node's own _ready(), or several calls at once - each has its
# own request id and polls independently).
func call_sdk(method: String, args: Array, on_success: Callable, on_error: Callable) -> void:
	if not _web_capable:
		push_warning("DavidnetSDK bridge: call_sdk(\\"%s\\") ignored - not running in the HTML5 export." % method)
		on_error.call("DavidnetSDK is only available in the HTML5 export")
		return

	if not _sdk_ready:
		await sdk_ready

	_next_request_id += 1
	var request_id := "r%d" % _next_request_id

	JavaScriptBridge.eval(
		"window.__dnStart(%s, %s, %s);" % [
			JSON.stringify(method), JSON.stringify(JSON.stringify(args)), JSON.stringify(request_id)
		],
		true
	)

	var poll_js := "window.__dnPoll(%s)" % JSON.stringify(request_id)
	var waited := 0.0
	while waited < 11.0:
		await get_tree().process_frame
		waited += get_process_delta_time()

		var raw = JavaScriptBridge.eval(poll_js, true)
		if typeof(raw) == TYPE_STRING and raw != "":
			var entry: Dictionary = JSON.parse_string(raw)
			if entry.get("success", false):
				on_success.call(JSON.parse_string(entry.get("data", "null")))
			else:
				on_error.call(entry.get("data", "Unknown error"))
			return

	push_warning("DavidnetSDK bridge: call_sdk(\\"%s\\") never got a response - giving up." % method)
	on_error.call("No response from DavidnetSDK")`;

	const usageHighscore = `func _on_game_over(final_score: int) -> void:
	call_sdk("applyHighscore", [final_score], _on_highscore_submitted, _on_sdk_error)

func _on_highscore_submitted(result: Dictionary) -> void:
	if result.get("isNewGlobalBest", false):
		show_message("New world record!")
	elif result.get("isNewPersonalBest", false):
		show_message("New personal best!")

func _on_sdk_error(message: String) -> void:
	print("DavidnetSDK call failed: ", message)`;

	const usageSave = `func _ready() -> void:
	call_sdk("getJsonBlob", [], _on_save_loaded, _on_sdk_error)

func _on_save_loaded(result: Dictionary) -> void:
	var data = result.get("data")
	if data == null:
		start_new_game()
	else:
		apply_save_data(data)

func _on_checkpoint(state: Dictionary) -> void:
	call_sdk("saveJsonBlob", [state], func(_r): pass, _on_sdk_error)`;

	const usageAchievement = `func _on_boss_defeated() -> void:
	var achievement := {
		"id": "first_boss_kill",
		"name": "Giant Slayer",
		"description": "Defeat the first boss",
		"icon": "⚔️"
	}
	call_sdk("unlockAchievement", [achievement], _on_achievement_result, _on_sdk_error)

func _on_achievement_result(result: Dictionary) -> void:
	if result.get("isNew", false):
		show_message("Achievement unlocked: Giant Slayer!")`;

	const usageRealtime = `# Nested methods use a dot-path, e.g. "realtime.joinQueue". Listeners (onMessage,
# onMatched, ...) are not part of this request/response bridge - see the note below.
func _find_opponent() -> void:
	call_sdk("realtime.joinQueue", ["ranked-1v1", 2], func(_r): pass, _on_sdk_error)

func _send_move(room: String, move: Dictionary) -> void:
	call_sdk("realtime.send", [room, { "type": "move", "move": move }], func(_r): pass, _on_sdk_error)`;

	const listenerBridge = `# Listeners (onMessage, onMatched, onState, ...) fire on their own, not in response to
# one call_sdk() request - the same polling idea works for these too: push every event
# into a JS-side array as it happens, drain that array once per frame from _process().
func _ready() -> void:
	# ... after the __dnStart/__dnPoll setup above ...
	JavaScriptBridge.eval("""
		window.__dnRealtimeEvents = [];
		function __dnPush(eventName) {
			return function(data) { window.__dnRealtimeEvents.push({ event: eventName, data: data }); };
		}
		var rt = window.DavidnetSDK.realtime;
		rt.onMessage(__dnPush("message"));
		rt.onMatched(__dnPush("matched"));
		rt.onPresence(__dnPush("presence"));
		rt.onState(__dnPush("state"));
		rt.onAnnouncement(__dnPush("announcement"));
		window.__dnPollRealtimeEvents = function() {
			if (window.__dnRealtimeEvents.length === 0) return "";
			var events = window.__dnRealtimeEvents;
			window.__dnRealtimeEvents = [];
			return JSON.stringify(events);
		};
	""", true)

func _process(_delta: float) -> void:
	var raw = JavaScriptBridge.eval("window.__dnPollRealtimeEvents()", true)
	if typeof(raw) != TYPE_STRING or raw == "":
		return
	for payload in JSON.parse_string(raw):
		match payload.event:
			"matched":
				_current_room = payload.data.get("room")
			"message":
				_apply_opponent_move(payload.data.get("data"))`;
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>Godot / other engines</h2>
			<Button iconbefore="arrow_back" onclick={() => navigateBack()}>Back</Button>
		</Flex>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<a href="/help/community-games">← All Community Games topics</a>
		</p>
		<Flex height="fit-content">
			<Button
				appearance="subtle"
				iconbefore="content_copy"
				onclick={() => copyDocsForAi(godotDocs, "The Godot / other engines page")}>
				Copy this page for AI
			</Button>
		</Flex>

		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Everything in these docs works no matter what built your game —
			<code>window.DavidnetSDK</code>
			 is injected into the <code>index.html</code> file itself, at the HTML level, not tied to any
			particular engine or language. A Godot project exported to HTML5/WebAssembly, a Unity WebGL
			build, or anything else that ends up as an <code>index.html</code> + JS/WASM bundle gets the
			exact same <code>window.DavidnetSDK</code> object. By the time your game's own code starts
			running, the SDK is already defined — the engine's own boot/loading sequence always takes
			longer than that.
		</p>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			The only catch: <code>window.DavidnetSDK</code>'s functions are plain JavaScript and return JS
			Promises, so a non-JS language needs its own engine-specific bridge to call them and get the
			result back.
		</p>

		<h3 style="margin-top: 1rem;">Full example project</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<strong>Click Rush</strong>
			 — a complete, working Godot 4.6 game that uses every single feature in these docs
			(highscores with multiple categories, saves, instant and progress-bar achievements, community
			levels, and realtime rooms/matchmaking/announcements), built with the bridge below. Grab
			either the source project (open it in Godot 4.6 and read through it) or the already-exported
			build (unzip and upload it directly to try it out first).
		</p>
		<Flex gap="small" height="fit-content" flexWrap="wrap">
			<LinkButton
				href="/downloads/community-games/davidnet-click-rush-source.zip"
				iconbefore="folder_zip">
				Download source project (.zip)
			</LinkButton>
			<LinkButton
				href="/downloads/community-games/davidnet-click-rush-web.zip"
				iconbefore="download"
				appearance="subtle">
				Download compiled example (.zip)
			</LinkButton>
		</Flex>

		<h3 style="margin-top: 1rem;">Godot 4.x: polling via <code>JavaScriptBridge.eval()</code></h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			<code>JavaScriptBridge</code>
			 (only present in the HTML5 export, not the editor or other export targets) also offers
			<code>JavaScriptBridge.create_callback(callable)</code>
			, which wraps a GDScript <code>Callable</code> so JavaScript can call it asynchronously (e.g.
			from a Promise's <code>.then()</code>) — the obvious choice for this bridge, and the one an
			earlier version of this page used. <strong>It turned out unreliable in practice</strong>: a
			call's resolve/reject callback could silently never fire even though the underlying HTTP
			request genuinely succeeded — no error, the call just hung forever, seemingly independent of
			timing or how many calls were in flight.
		</p>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			The bridge below avoids <code>create_callback</code> entirely and instead polls using just
			<code>JavaScriptBridge.eval(code, true)</code>
			's <strong>return value</strong> — a plain synchronous call/return with nothing to "wire up"
			that can silently fail to be. Each call gets a unique request id; the JS side stores its
			result in a small object keyed by that id as soon as the Promise settles, and GDScript polls
			for it once per frame via another <code>eval()</code> call until it appears. Everything still
			passes as JSON strings both ways, so GDScript only ever deals with normal
			<code>Dictionary</code>
			/
			<code>Array</code>
			 values via its own built-in <code>JSON.parse_string()</code>/<code>JSON.stringify()</code>.
			Drop this in as an autoload (or anywhere that runs once on boot):
		</p>
		<CodeSnippet code={bridge} language="python" filename="davidnet_sdk_bridge.gd" />
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Shown with Python syntax coloring above since GDScript isn't in the highlighter's language
			list — the file itself is GDScript (<code>.gd</code>).
		</p>

		<h3 style="margin-top: 1.5rem;">Example: submitting a score</h3>
		<CodeSnippet code={usageHighscore} language="python" filename="example_highscore.gd" />

		<h3 style="margin-top: 1.5rem;">Example: save data</h3>
		<CodeSnippet code={usageSave} language="python" filename="example_save.gd" />

		<h3 style="margin-top: 1.5rem;">Example: achievements</h3>
		<CodeSnippet code={usageAchievement} language="python" filename="example_achievement.gd" />

		<h3 style="margin-top: 1.5rem;">Example: realtime calls</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Nested methods (everything under <code>DavidnetSDK.realtime</code>) use a dot-path, e.g.
			<code>"realtime.joinQueue"</code>
			, with the same <code>call_sdk</code> helper:
		</p>
		<CodeSnippet code={usageRealtime} language="python" filename="example_realtime.gd" />

		<h3 style="margin-top: 1.5rem;">Realtime listeners (onMessage, onMatched, ...)</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			The <code>call_sdk</code> helper above is request/response shaped: one call in, one result
			back. Realtime listeners are different — they fire on their own, any number of times, not in
			response to a specific call. The same polling idea still works: push every event into a
			JS-side array as it happens, then drain that array once per frame from <code>_process()</code>:
		</p>
		<CodeSnippet code={listenerBridge} language="python" filename="example_realtime_listeners.gd" />

		<h3 style="margin-top: 1.5rem;">Export settings that work (and what doesn't)</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Davidnet's game-file server does NOT send <code>Cross-Origin-Opener-Policy</code>/
			<code>Cross-Origin-Embedder-Policy</code>
			 headers, and won't by default — those headers would also block the documented "load anything
			from a CDN" sandbox behavior for every game, not just yours. That has concrete implications for
			your Web export settings (<strong>Project &gt; Export &gt; your Web preset &gt; Options</strong>):
		</p>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li>
				<strong>Thread Support must be OFF.</strong>
				 A threaded export requires <code>SharedArrayBuffer</code>, which browsers only expose on a
				cross-origin-isolated page (the headers above). Upload a threaded build and players get a
				hard "Error: The following features required to run Godot projects on the Web are missing:
				Cross-Origin Isolation... SharedArrayBuffer..." screen instead of your game. Almost no
				GDScript-only game actually needs this — it only matters for heavy parallel computation
				you'd otherwise hand off to Godot's worker threads.
			</li>
			<li>
				<strong>C# / .NET is not supported, full stop</strong>
				 — not a Davidnet limitation, a Godot one: the official .NET/Mono export templates don't
				ship Web/HTML5 templates at all (checked directly against the official 4.6.3 release assets
				— the mono template package has Android/iOS/Linux/macOS/Windows templates and zero Web
				ones). If your project uses any <code>.cs</code> scripts, Web export isn't available in
				Godot itself, regardless of this platform. Use GDScript.
			</li>
			<li>
				<strong>GDExtension (native addons) won't work either</strong>
				 — same reasoning: nothing compiles anything for you on upload, and a native addon built for
				desktop can't run inside the browser's WASM sandbox regardless of what Davidnet does.
			</li>
			<li>
				<strong>The export filename must be <code>index.html</code>.</strong>
				 Whatever you type as the export path's filename becomes the name of every generated file
				(<code>.html</code>, <code>.wasm</code>, <code>.pck</code>, <code>.js</code>) — name it
				<code>index</code>
				, not your project name, or your zip won't have <code>index.html</code> at its root and the
				upload will be rejected (see
				<a href="/help/community-games/troubleshooting">Troubleshooting</a>
				).
			</li>
			<li>
				<strong>Everything else is fair game</strong>
				 — texture compression settings, canvas resize policy, custom HTML shell, PWA options
				(though nothing serves a manifest for you inside the iframe, so install prompts won't do
				much there). None of it interacts with the sandbox.
			</li>
		</ul>

		<h3 style="margin-top: 1.5rem;">Godot 3.x</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			The equivalent singleton is the older <code>JavaScript</code> (not
			<code>JavaScriptBridge</code>
			) with a slightly different API — e.g. <code>JSON.parse(text).result</code> instead of
			<code>JSON.parse_string(text)</code>
			. The same JSON-bridge idea still works, but verify exact method names against the 3.x docs,
			or upgrade to 4.x.
		</p>

		<h3 style="margin-top: 1.5rem;">Unity (WebGL) and other engines</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			The same idea applies to any engine that exports to HTML5/WASM: find that engine's mechanism
			for calling into page-level JavaScript and receiving a callback back (Unity WebGL uses
			<code>.jslib</code>
			 plugin files with <code>[DllImport("__Internal")]</code> extern functions, for example), then
			apply the same pattern as above — one small JS helper that resolves the Promise and hands the
			result back as a JSON string, so your engine-side code never has to deal with JS objects or
			Promises directly.
		</p>
	</Flex>
</Flex>
