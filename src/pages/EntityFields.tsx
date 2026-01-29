import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldsManager } from "@/components/fields/FieldsManager";
import { ENTITY_TABLE_LABELS } from "@/types/entity-fields";

const ENTITY_TABLES = [
  'influencers',
  'resellers',
  'suppliers',
  'corporate_management',
  'personal_contacts',
] as const;

export default function EntityFields() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('entity') || 'influencers';

  const handleTabChange = (value: string) => {
    setSearchParams({ entity: value });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
        <div className="border-b px-6 pt-4">
          <TabsList className="mb-4">
            {ENTITY_TABLES.map((table) => (
              <TabsTrigger key={table} value={table}>
                {ENTITY_TABLE_LABELS[table]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        {ENTITY_TABLES.map((table) => (
          <TabsContent key={table} value={table} className="flex-1 mt-0">
            <FieldsManager entityTable={table} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
