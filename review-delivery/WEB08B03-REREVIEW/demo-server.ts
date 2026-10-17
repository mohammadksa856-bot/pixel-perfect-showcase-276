// Independent local browser harness; author source is imported without modification.
import { createDemoServer } from "../../research-evidence/aramco-disclosures/demo";
const server = createDemoServer("http://127.0.0.1:5173");
server.prependListener("request", (_req, res) => {
  res.setHeader("X-Independent-Application-SHA", "1735609abafa85ee6e101ab7e3640496f0e43088");
});
server.listen(4454, "127.0.0.1", () =>
  console.log("Independent B03 review: 127.0.0.1:4454; fixed application1735609"),
);
