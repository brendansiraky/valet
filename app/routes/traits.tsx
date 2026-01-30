import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { PageLayout } from "~/components/page-layout";
import { TraitCard } from "~/components/trait-card";
import { TraitCardSkeleton } from "~/components/trait-card-skeleton";
import { TraitFormDialog } from "~/components/trait-form-dialog";
import { useTraits } from "~/hooks/queries/use-traits";

export default function Traits() {
  const traitsQuery = useTraits();

  // Loading state - show skeleton cards
  if (traitsQuery.isPending) {
    return (
      <PageLayout
        title="My Traits"
        description="Create reusable context snippets for your agents"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <TraitCardSkeleton key={i} />
          ))}
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (traitsQuery.isError) {
    return (
      <PageLayout
        title="My Traits"
        description="Create reusable context snippets for your agents"
      >
        <Card className="mx-auto max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Error loading traits</CardTitle>
            <CardDescription>
              {traitsQuery.error.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => traitsQuery.refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const userTraits = traitsQuery.data;

  return (
    <PageLayout
      title="My Traits"
      description="Create reusable context snippets for your agents"
      headerActions={
        <TraitFormDialog
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Create Trait
            </Button>
          }
        />
      }
    >
      {userTraits.length === 0 ? (
        <Card className="mx-auto max-w-md">
          <CardHeader className="text-center">
            <CardTitle>No traits yet</CardTitle>
            <CardDescription>
              Create your first trait to get started. Traits define reusable context that can be attached to agents.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <TraitFormDialog
              trigger={
                <Button>
                  <Plus className="mr-2 size-4" />
                  Create Your First Trait
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userTraits.map((trait) => (
            <TraitCard key={trait.id} trait={trait} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
