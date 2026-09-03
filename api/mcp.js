const handler = import("../lib/mcp-http.mjs");

module.exports = async function mcp(request, response) {
  return (await handler).handleMcp(request, response);
};
