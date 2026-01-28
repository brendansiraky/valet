import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Plus, X } from "lucide-react";

import type { TemplateVariable } from "~/db/schema/pipelines";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  onSave: (variables: TemplateVariable[]) => Promise<void>;
}

export function TemplateDialog({
  open,
  onOpenChange,
  pipelineId,
  onSave,
}: TemplateDialogProps) {
  const [variables, setVariables] = useState<TemplateVariable[]>([
    { name: "", description: "", defaultValue: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addVariable = () => {
    setVariables([...variables, { name: "", description: "", defaultValue: "" }]);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const updateVariable = (
    index: number,
    field: keyof TemplateVariable,
    value: string
  ) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  };

  const handleSave = async () => {
    // Filter out empty variables
    const validVariables = variables.filter((v) => v.name.trim() !== "");

    setIsSaving(true);
    try {
      await onSave(validVariables);
      onOpenChange(false);
      // Reset form
      setVariables([{ name: "", description: "", defaultValue: "" }]);
    } catch (error) {
      console.error("Failed to save template:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Define input variables that users can fill in when running this
            pipeline. Use{" "}
            <code className="bg-muted px-1 rounded">{"{{variableName}}"}</code>{" "}
            in your agent instructions to reference variables.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Variables</Label>
            <Button type="button" variant="outline" size="sm" onClick={addVariable}>
              <Plus className="w-4 h-4 mr-1" />
              Add Variable
            </Button>
          </div>

          {variables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No variables defined. Click "Add Variable" to create one.
            </p>
          ) : (
            <div className="space-y-4">
              {variables.map((variable, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 relative"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => removeVariable(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`var-name-${index}`}>Variable Name</Label>
                      <Input
                        id={`var-name-${index}`}
                        value={variable.name}
                        onChange={(e) => updateVariable(index, "name", e.target.value)}
                        placeholder="e.g., topic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`var-default-${index}`}>Default Value</Label>
                      <Input
                        id={`var-default-${index}`}
                        value={variable.defaultValue ?? ""}
                        onChange={(e) =>
                          updateVariable(index, "defaultValue", e.target.value)
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`var-desc-${index}`}>Description</Label>
                    <Textarea
                      id={`var-desc-${index}`}
                      value={variable.description ?? ""}
                      onChange={(e) =>
                        updateVariable(index, "description", e.target.value)
                      }
                      placeholder="Help text for users filling in this variable"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { TemplateVariable } from "~/db/schema/pipelines";
