import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
  disabled?: boolean;
}

export function CategorySelector({
  categories,
  selectedCategoryId,
  onSelect,
  disabled = false,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[180px] justify-between"
          disabled={disabled}
        >
          {selectedCategory ? (
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: selectedCategory.color || "#6366f1" }}
              />
              <span className="truncate">{selectedCategory.name}</span>
            </div>
          ) : (
            "Select category..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => {
                    onSelect(category.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCategoryId === category.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span
                    className="mr-2 h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: category.color || "#6366f1" }}
                  />
                  {category.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
