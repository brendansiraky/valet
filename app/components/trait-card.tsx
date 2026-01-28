import { Pencil, Trash2 } from "lucide-react";
import { Form } from "react-router";
import type { Trait } from "~/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { TraitFormDialog } from "./trait-form-dialog";

interface TraitCardProps {
  trait: Pick<Trait, "id" | "name" | "context" | "updatedAt">;
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return diffDay === 1 ? "1 day ago" : `${diffDay} days ago`;
  }
  if (diffHour > 0) {
    return diffHour === 1 ? "1 hour ago" : `${diffHour} hours ago`;
  }
  if (diffMin > 0) {
    return diffMin === 1 ? "1 minute ago" : `${diffMin} minutes ago`;
  }
  return "just now";
}

export function TraitCard({ trait }: TraitCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{trait.name}</CardTitle>
        <CardDescription>
          Updated {formatRelativeTime(trait.updatedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {trait.context}
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <TraitFormDialog
          trait={trait}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          }
        />
        <Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="traitId" value={trait.id} />
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </Form>
      </CardFooter>
    </Card>
  );
}
