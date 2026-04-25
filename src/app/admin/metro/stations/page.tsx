import { redirect } from "next/navigation";

export default function AdminStationsRedirect() {
  redirect("/control/metro/stations");
}
