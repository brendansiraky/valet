import { useState, useEffect } from "react";
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

interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
}

interface VariableFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  variables: TemplateVariable[];
  onSubmit: (values: Record<string, string>) => void;
}

export function VariableFillDialog({
  open,
  onOpenChange,
  templateName,
  variables,
  onSubmit,
}: VariableFillDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  // Initialize with default values when dialog opens
  useEffect(() => {
    if (open) {
      const initialValues: Record<string, string> = {};
      variables.forEach((v) => {
        initialValues[v.name] = v.defaultValue || "";
      });
      setValues(initialValues);
    }
  }, [open, variables]);

  const updateValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit(values);
    onOpenChange(false);
  };

  // Check if all required fields have values
  const isValid = variables.every((v) => values[v.name]?.trim() !== "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Run Pipeline: {templateName}</DialogTitle>
          <DialogDescription>
            Fill in the values for this pipeline template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {variables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              This template has no variables. Click Run to execute.
            </p>
          ) : (
            variables.map((variable) => (
              <div key={variable.name} className="space-y-2">
                <Label htmlFor={`fill-${variable.name}`}>
                  {variable.name}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                {variable.description && (
                  <p className="text-xs text-muted-foreground">
                    {variable.description}
                  </p>
                )}
                {/* Use textarea for longer inputs, input for short ones */}
                {variable.description && variable.description.length > 50 ? (
                  <Textarea
                    id={`fill-${variable.name}`}
                    value={values[variable.name] || ""}
                    onChange={(e) => updateValue(variable.name, e.target.value)}
                    placeholder={variable.defaultValue || `Enter ${variable.name}`}
                    rows={3}
                  />
                ) : (
                  <Input
                    id={`fill-${variable.name}`}
                    value={values[variable.name] || ""}
                    onChange={(e) => updateValue(variable.name, e.target.value)}
                    placeholder={variable.defaultValue || `Enter ${variable.name}`}
                  />
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid && variables.length > 0}>
            Run Pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
