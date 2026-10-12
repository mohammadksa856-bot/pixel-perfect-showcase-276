import { createServerFn } from "@tanstack/react-start";
import type { PeerTable } from "./peer-comparison";

/** دالة خادم يستدعيها loader صفحة الشركة. تعيد null والعلم معطّل. */
export const getPeerTable = createServerFn({ method: "GET" })
  .validator((input: { market: string; symbol: string }) => {
    if (!/^[A-Za-z]{2}$/.test(input.market) || !/^[A-Za-z0-9.]{1,12}$/.test(input.symbol)) {
      throw new Error("invalid company reference");
    }
    return input;
  })
  .handler(async ({ data }): Promise<PeerTable | null> => {
    const { fetchPeerTable } = await import("./peer-comparison.server");
    return fetchPeerTable(data);
  });
