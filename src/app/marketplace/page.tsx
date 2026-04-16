import { redirect } from "next/navigation";

/**
 * Marketplace has been retired. Redirect anyone who lands here to the tutors page.
 */
export default function MarketplacePage() {
  redirect("/tutors");
}
