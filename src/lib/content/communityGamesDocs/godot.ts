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
Note it warns (\`push_warning\`) rather than failing silently when not running in the HTML5 export
(e.g. testing in the editor), both on boot and on every \`call_sdk\` call made in that state:

\`\`\`gdscript
extends Node

var _sdk_ready := false

func _ready() -> void:
	if not OS.has_feature("web"):
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
	_sdk_ready = true

# Call any window.DavidnetSDK method - dot-path for nested ones, e.g. "realtime.send" with
# args = [room, data]. on_success receives a parsed Dictionary/Array/primitive, on_error a String.
func call_sdk(method: String, args: Array, on_success: Callable, on_error: Callable) -> void:
	if not _sdk_ready:
		push_warning("DavidnetSDK bridge: call_sdk(\\"%s\\") ignored - not running in the HTML5 export." % method)
		on_error.call("DavidnetSDK is only available in the HTML5 export")
		return

	var resolve_cb := JavaScriptBridge.create_callback(func(cb_args):
		on_success.call(JSON.parse_string(cb_args[0]))
	)
	var reject_cb := JavaScriptBridge.create_callback(func(cb_args):
		on_error.call(cb_args[0])
	)
	var window_obj := JavaScriptBridge.get_interface("window")
	window_obj.__dnCall(method, JSON.stringify(args), resolve_cb, reject_cb)
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
condition to guard against.

**Godot 3.x** uses the older \`JavaScript\` singleton (not \`JavaScriptBridge\`) with a slightly
different API (e.g. \`JSON.parse(text).result\` instead of \`JSON.parse_string(text)\`) - the same
JSON-bridge idea still works, but verify exact method names against the 3.x docs, or upgrade to 4.x.

**Unity (WebGL) and other engines**: find that engine's mechanism for calling into page-level
JavaScript and receiving a callback back (Unity WebGL uses \`.jslib\` plugin files with
\`[DllImport("__Internal")]\` extern functions, for example), then apply the same pattern - one small
JS helper that resolves the Promise and hands the result back as a JSON string.
`;
