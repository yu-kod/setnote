import { useParams } from "react-router-dom";
import { SetlistEditor } from "../features/setlist/components/SetlistEditor";

export default function SetlistEditPage() {
  const { id } = useParams<{ id: string }>();
  return <SetlistEditor id={id!} />;
}
