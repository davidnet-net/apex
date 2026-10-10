<script lang="ts">
	import { Button, CodeSnippet, Flex, navigateBack } from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";

	const bridge = `extends Node

# --- Davidnet SDK bridge for Godot HTML5 exports ---
# Call this once (e.g. from an autoload's _ready) before using call_sdk() anywhere else.
func _ready() -> void:
	if not OS.has_feature("web"):
		return  # this bridge only exists in the HTML5 export, not when running in the editor

	JavaScriptBridge.eval("""
		window.__dnCall = function(method, argsJson, onResolve, onReject) {
			var args = JSON.parse(argsJson);
			var path = method.split(".");
			var target = window.DavidnetSDK;
			for (var i = 0; i < path.length - 1; i++) target = target[path[i]];
			var fn = target[path[path.length - 1]];
			Promise.resolve(fn.apply(target, args)).then(function(result) {
				onResolve(JSON.stringify(result === undefined ? null : result));
			}).catch(function(err) {
				onReject(String(err && err.message ? err.message : err));
			});
		};
	""", true)


# Calls any window.DavidnetSDK method - use a dot-path for nested ones, e.g. "realtime.send".
# on_success receives a parsed Dictionary/Array/primitive, on_error receives an error String.
func call_sdk(method: String, args: Array, on_success: Callable, on_error: Callable) -> void:
	var resolve_cb := JavaScriptBridge.create_callback(func(cb_args):
		on_success.call(JSON.parse_string(cb_args[0]))
	)
	var reject_cb := JavaScriptBridge.create_callback(func(cb_args):
		on_error.call(cb_args[0])
	)
	var window_obj := JavaScriptBridge.get_interface("window")
	window_obj.__dnCall(method, JSON.stringify(args), resolve_cb, reject_cb)`;

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

	const listenerBridge = `# Listeners (onMessage, onMatched, onState, ...) fire on their own, not in response
# to one call_sdk() request - bridge them once in _ready with a small JS shim that
# forwards every event into one GDScript callback.
func _ready() -> void:
	# ... after the __dnCall setup from above ...
	var forward_cb := JavaScriptBridge.create_callback(func(cb_args):
		var payload = JSON.parse_string(cb_args[0])
		_on_realtime_event(payload.event, payload.data)
	)

	JavaScriptBridge.eval("""
		window.__dnForward = function(forwardCb) {
			window.DavidnetSDK.realtime.onMatched(function(data) {
				forwardCb(JSON.stringify({ event: "matched", data: data }));
			});
			window.DavidnetSDK.realtime.onMessage(function(data) {
				forwardCb(JSON.stringify({ event: "message", data: data }));
			});
		};
	""", true)

	JavaScriptBridge.get_interface("window").__dnForward(forward_cb)

func _on_realtime_event(event_name: String, data: Dictionary) -> void:
	match event_name:
		"matched":
			_current_room = data.get("room")
		"message":
			_apply_opponent_move(data.get("data"))`;
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

		<h3 style="margin-top: 1rem;">Godot 4.x: the <code>JavaScriptBridge</code> singleton</h3>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Only present in the HTML5 export, not the editor or other export targets:
		</p>
		<ul style="margin: 0; padding-left: 20px; color: {token.theme.color.text.secondary}">
			<li>
				<code>JavaScriptBridge.eval(code, true)</code>
				 runs a string of JS once — used below to define one small reusable helper function on the
				JS side.
			</li>
			<li>
				<code>JavaScriptBridge.create_callback(callable)</code>
				 wraps a GDScript <code>Callable</code> so JavaScript can call it (e.g. from a Promise's
				<code>.then()</code>
				/
				<code>.catch()</code>
				).
			</li>
			<li>
				<code>JavaScriptBridge.get_interface("window")</code>
				 gets a GDScript-callable handle to the page's <code>window</code> object.
			</li>
		</ul>
		<p style="color: {token.theme.color.text.secondary}; max-width: 70ch;">
			Rather than wrestling with JS objects from GDScript directly, the helper below passes
			everything as JSON strings both ways — arguments out, results back in — so GDScript only ever
			deals with normal <code>Dictionary</code>/<code>Array</code> values via its own built-in
			<code>JSON.parse_string()</code>
			/
			<code>JSON.stringify()</code>
			. Drop this in as an autoload (or anywhere that runs once on boot):
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
			response to a specific call. Bridge those once with a small JS shim that forwards every event
			into one GDScript callback:
		</p>
		<CodeSnippet code={listenerBridge} language="python" filename="example_realtime_listeners.gd" />

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
