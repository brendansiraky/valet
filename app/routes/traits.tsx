import { Plus, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { TraitCard } from "~/components/trait-card";
import { TraitFormDialog } from "~/components/trait-form-dialog";
import { useTraits } from "~/hooks/queries/use-traits";

export default function Traits() {
  const traitsQuery = useTraits();

  // Loading state
  if (traitsQuery.isPending) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My Traits</h1>
            <p className="text-muted-foreground">
              Create reusable context snippets for your agents
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (traitsQuery.isError) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My Traits</h1>
            <p className="text-muted-foreground">
              Create reusable context snippets for your agents
            </p>
          </div>
        </div>
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
      </div>
    );
  }

  const userTraits = traitsQuery.data;

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Traits</h1>
          <p className="text-muted-foreground">
            Create reusable context snippets for your agents
          </p>
        </div>
        <TraitFormDialog
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Create Trait
            </Button>
          }
        />
      </div>

      {/* Content */}
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
    </div>
  );
}
