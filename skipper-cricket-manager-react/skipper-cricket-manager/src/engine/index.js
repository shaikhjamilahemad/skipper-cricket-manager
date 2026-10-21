// The game engine. These files are plain scripts that attach themselves to window.SK.
// They have no UI code, so they run the same in the browser, in the APK and in Node (see tools/).
// Order matters: later files use earlier ones.
import './util.js';
import './data.js';
import './engine.js';
import './db.js';
import './names.js';
import './world.js';
import './auction.js';
import './career.js';
import './store.js';

export const SK = window.SK;
export default SK;
