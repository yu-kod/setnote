import { useParams } from "react-router-dom";
import { SetlistDesigner } from "../features/setlist/components/SetlistDesigner";

export default function SetlistDesignPage() {
  const { id } = useParams<{ id: string }>();
  return <SetlistDesigner id={id!} />;
}
