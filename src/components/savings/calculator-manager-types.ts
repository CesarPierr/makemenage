export type DraftField = {
  draftId: string;
  key: string;
  label: string;
  type: "number" | "amount" | "percent";
  defaultValue: string;
  helperText: string;
  isRequired: boolean;
};
