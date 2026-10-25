// Worker entry point. Only the default export lives here: workerd treats every named export of the main module as an
// entry point, so the chat logic (and its exports for the tests) is in chat.js.
import { handle } from './chat.js';

export default { fetch: (request, env) => handle(request, env) };
