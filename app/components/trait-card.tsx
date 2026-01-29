import { Pencil, Trash2 } from "lucide-react";
import type { Trait } from "~/db";
import { Button } from "~/components/ui/button";
import { ResourceCard } from "./resource-card";
import { TraitFormDialog } from "./trait-form-dialog";
import { TraitDeleteDialog } from "./trait-delete-dialog";

interface TraitCardProps {
  trait: Pick<Trait, "id" | "name" | "context" | "color" | "updatedAt">;
}

export function TraitCard({ trait }: TraitCardProps) {
  return (
    <ResourceCard
      title={trait.name}
      updatedAt={trait.updatedAt}
      description={trait.context}
      accentColor={trait.color}
      actions={
        <>
          <TraitFormDialog
            trait={trait}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
            }
          />
          <TraitDeleteDialog
            trait={trait}
            trigger={
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            }
          />
        </>
      }
    />
  );
}
