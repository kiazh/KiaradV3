import { HomeSheet } from "../components/HomeSheet";
import { Shell } from "../components/Shell";

// Regenerate on the same cadence as the Bungie data so the server-rendered raid never goes stale for long.
export const revalidate = 600;

export default function Home() {
  return (
    <Shell>
      <HomeSheet />
    </Shell>
  );
}
