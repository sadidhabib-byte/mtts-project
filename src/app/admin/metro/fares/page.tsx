import { redirect } from "next/navigation";

export default function AdminFaresRedirect() {
  redirect("/control/metro/fares");
}
