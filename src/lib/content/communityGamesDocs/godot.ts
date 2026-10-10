export const godot = `## Using the SDK from Godot (HTML5/WebAssembly export), or any non-JS engine

\`window.DavidnetSDK\` is injected into the \`index.html\` file itself, at the HTML level - it works
identically no matter what produced that \`index.html\`. A Godot project exported to HTML5, a Unity
WebGL build, or a plain hand-written game all get the exact same \`window.DavidnetSDK\` object. The
only engine-specific part is bridging into it, since its functions are plain JS and return Promises,
which a non-JS language can't \`await\` directly.

For **Godot 4.x**, use the built-in \`JavaScriptBridge\` singleton (present only in the HTML5 export,
not the editor or other export targets): \`JavaScriptBridge.eval(code, true)\` to define a JS helper
once, \`JavaScriptBridge.create_callback(callable)\` to let JS call back into a GDScript \`Callable\`
(e.g. from a Promise's \`.then()\`/\`.catch()\`), and \`JavaScriptBridge.get_interface("window")\` to
get a GDScript-callable handle to \`window\`. The pattern below routes every call through one small
JS helper and passes everything as JSON strings both ways, so GDScript only ever deals with normal
\`Dictionary\`/\`Array\` values via its own \`JSON.parse_string()\`/\`JSON.stringify()\` - no manual
JS-object property walking needed. Drop this in as an autoload (or anywhere that runs once on boot).

Two non-obvious things this bridge handles, found the hard way while building the example project
below - worth knowing if you ever rewrite this yourself:

- **A call fired the instant the game boots can hang forever with no error.** \`JavaScriptBridge\`
  callbacks created before the browser has processed a single event-loop tick aren't reliably wired
  up yet - the real \`window.DavidnetSDK\` method still gets called, but the response never makes it
  back. The bridge waits one frame plus a small margin before accepting calls, via the \`sdk_ready\`
  signal.
- **Several calls fired in the same engine tick don't all come back either** - e.g. two different
  screens each loading their own data from \`_ready()\`, which is completely normal to want to do.
  Only some of the simultaneously-created callbacks survive. The bridge queues calls and dispatches
  them one at a time, waiting for each one to actually resolve before starting the next, so every
  call site can just fire calls from wherever is natural without knowing any of this.

\`\`\`gdscript
extends Node

signal sdk_ready

var _web_capable := false
var _sdk_ready := false
var _call_queue: Array[Dictionary] = []
var _draining_queue := false

func _ready() -> void:
	_web_capable = OS.has_feature("web")
	if not _web_capable:
		push_warning("DavidnetSDK bridge: not running in the HTML5 export - SDK calls will be no-ops.")
		return

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

	await get_tree().process_frame
	await get_tree().create_timer(0.2).timeout
	_sdk_ready = true
	sdk_ready.emit()


# Calls any window.DavidnetSDK method - dot-path for nested ones, e.g. "realtime.send" with
# args = [room, data]. on_success receives a parsed Dictionary/Array/primitive, on_error a String.
func call_sdk(method: String, args: Array, on_success: Callable, on_error: Callable) -> void:
	if not _web_capable:
		push_warning("DavidnetSDK bridge: call_sdk(\\"%s\\") ignored - not running in the HTML5 export." % method)
		on_error.call("DavidnetSDK is only available in the HTML5 export")
		return

	_call_queue.append({
		"method": method, "args": args, "on_success": on_success, "on_error": on_error
	})
	if not _draining_queue:
		_drain_queue()


func _drain_queue() -> void:
	_draining_queue = true
	while not _call_queue.is_empty():
		if not _sdk_ready:
			await sdk_ready
		var request: Dictionary = _call_queue.pop_front()
		await _dispatch_call(request.method, request.args, request.on_success, request.on_error)
	_draining_queue = false


func _dispatch_call(method: String, args: Array, on_success: Callable, on_error: Callable) -> void:
	var settled := false
	var resolve_cb := JavaScriptBridge.create_callback(func(cb_args: Array):
		settled = true
		on_success.call(JSON.parse_string(cb_args[0]))
	)
	var reject_cb := JavaScriptBridge.create_callback(func(cb_args: Array):
		settled = true
		on_error.call(cb_args[0])
	)
	var window_obj := JavaScriptBridge.get_interface("window")
	window_obj.__dnCall(method, JSON.stringify(args), resolve_cb, reject_cb)

	var waited := 0.0
	while not settled and waited < 11.0:
		await get_tree().process_frame
		waited += get_process_delta_time()
	if not settled:
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
\`call_sdk()\` request - bridge those once with a small JS shim that forwards every event into one
GDScript callback:

\`\`\`gdscript
func _ready() -> void:
	# ... after the __dnCall setup above ...
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
			_apply_opponent_move(data.get("data"))
\`\`\`

By the time a game's own code starts running, \`window.DavidnetSDK\` is already defined - the
engine's own boot/loading sequence always takes longer than the SDK's setup, so there is no race
condition to guard against for THAT part specifically (see the two bullets above for the races that
do matter).

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

**Godot 3.x** uses the older \`JavaScript\` singleton (not \`JavaScriptBridge\`) with a slightly
different API (e.g. \`JSON.parse(text).result\` instead of \`JSON.parse_string(text)\`) - the same
JSON-bridge idea still works, but verify exact method names against the 3.x docs, or upgrade to 4.x.

**Unity (WebGL) and other engines**: find that engine's mechanism for calling into page-level
JavaScript and receiving a callback back (Unity WebGL uses \`.jslib\` plugin files with
\`[DllImport("__Internal")]\` extern functions, for example), then apply the same pattern - one small
JS helper that resolves the Promise and hands the result back as a JSON string. The two races
described above (callbacks created before the first event-loop tick, and several created in the
same tick) are Emscripten/browser-level issues, not Godot-specific - the same queueing approach is
worth carrying over regardless of engine.
`;
