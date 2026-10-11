export const godot = `## Using the SDK from Godot (HTML5/WebAssembly export), or any non-JS engine

\`window.DavidnetSDK\` is injected into the \`index.html\` file itself, at the HTML level - it works
identically no matter what produced that \`index.html\`. A Godot project exported to HTML5, a Unity
WebGL build, or a plain hand-written game all get the exact same \`window.DavidnetSDK\` object. The
only engine-specific part is bridging into it, since its functions are plain JS and return Promises,
which a non-JS language can't \`await\` directly.

For **Godot 4.x**, use the built-in \`JavaScriptBridge\` singleton (present only in the HTML5 export,
not the editor or other export targets). The pattern below is deliberately NOT built on
\`JavaScriptBridge.create_callback()\` for responses - an earlier version of this bridge was, and it
turned out unreliable in practice: a call's resolve/reject callback could silently never fire even
though the underlying HTTP request genuinely succeeded, no error, the call just hung forever.
Instead it polls via \`JavaScriptBridge.eval(code, true)\`'s **return value** - \`eval\` is a plain
synchronous call/return, there's no async callback registration that can silently fail to be wired
up. Drop this in as an autoload (or anywhere that runs once on boot):

\`\`\`gdscript
extends Node

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


# Calls any window.DavidnetSDK method - dot-path for nested ones, e.g. "realtime.send" with
# args = [room, data]. on_success receives a parsed Dictionary/Array/primitive, on_error a String.
# Polls once per frame for up to 11s - plenty responsive for a real ~30-40ms round trip, and safe
# to call from anywhere (including straight from a node's own _ready(), or several calls at once -
# each has its own request id and polls independently, no shared state between calls).
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
	on_error.call("No response from DavidnetSDK")
\`\`\`

Usage from anywhere in the project once the above is autoloaded:

\`\`\`gdscript
func _on_game_over(final_score: int) -> void:
	call_sdk("applyHighscore", [final_score], _on_highscore_submitted, _on_sdk_error)

func _on_highscore_submitted(result: Dictionary) -> void:
	if result.get("isNewGlobalBest", false):
		show_message("New world record!")

func _on_sdk_error(message: String) -> void:
	print("DavidnetSDK call failed: ", message)
\`\`\`

Realtime listeners (\`onMessage\`, \`onMatched\`, ...) fire on their own, not in response to one
\`call_sdk()\` request - the same polling idea works for these too: push every event into a JS-side
array as it happens, and drain that array once per frame from \`_process()\`:

\`\`\`gdscript
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
				_apply_opponent_move(payload.data.get("data"))
\`\`\`

By the time a game's own code starts running, \`window.DavidnetSDK\` is already defined - the
engine's own boot/loading sequence always takes longer than the SDK's setup.

## Export settings that work (and what doesn't)

Davidnet's game-file server does NOT send \`Cross-Origin-Opener-Policy\`/\`Cross-Origin-Embedder-Policy\`
headers, and won't by default - those headers would also block the documented "load anything from a
CDN" sandbox behavior for every game, not just yours. That has concrete implications for your Web
export settings (Project > Export > your Web preset > Options):

- **Thread Support must be OFF.** A threaded export requires \`SharedArrayBuffer\`, which browsers
  only expose on a cross-origin-isolated page (the headers above). Upload a threaded build and
  players get a hard "Error: The following features required to run Godot projects on the Web are
  missing: Cross-Origin Isolation... SharedArrayBuffer..." screen instead of your game. Almost no
  GDScript-only game actually needs this - it only matters for heavy parallel computation you'd
  otherwise hand off to Godot's worker threads.
- **C# / .NET is not supported, full stop** - not a Davidnet limitation, a Godot one: the official
  .NET/Mono export templates don't ship Web/HTML5 templates at all (checked directly against the
  official 4.6.3 release assets - the mono template package has Android/iOS/Linux/macOS/Windows
  templates and zero Web ones). If your project uses any \`.cs\` scripts, Web export isn't available
  in Godot itself, regardless of this platform. Use GDScript.
- **GDExtension (native addons) won't work either** - same reasoning: nothing compiles anything for
  you on upload, and a native addon built for desktop can't run inside the browser's WASM sandbox
  regardless of what Davidnet does.
- **The export filename must be \`index.html\`.** Whatever you type as the export path's filename
  becomes the name of every generated file (\`.html\`, \`.wasm\`, \`.pck\`, \`.js\`) - name it \`index\`,
  not your project name, or your zip won't have \`index.html\` at its root and the upload will be
  rejected (see Troubleshooting).
- **Everything else is fair game** - texture compression settings, canvas resize policy, custom HTML
  shell, PWA options (though nothing serves a manifest for you inside the iframe, so install prompts
  won't do much there), all fine. None of it interacts with the sandbox.

**Godot 3.x** uses the older \`JavaScript\` singleton (not \`JavaScriptBridge\`), but has the same
\`eval()\`-with-a-return-value capability, so the same polling pattern applies - verify exact method
names against the 3.x docs, or upgrade to 4.x.

**Unity (WebGL) and other engines**: find that engine's mechanism for evaluating JS and getting a
return value back synchronously (Unity WebGL uses \`.jslib\` plugin files with
\`[DllImport("__Internal")]\` extern functions, which can return values directly), then apply the
same polling pattern - avoid relying on an async callback/delegate registration mechanism for the
response if the engine offers one, for the same reason described above.
`;
