import { Button, Box, Typography, Chip, Stack, IconButton, Tooltip, Divider } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import ResetIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import * as yup from "yup";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Drawer from "../../components/Drawer";
import { showSuccess, showError } from "../../components/SweetAlert";
import branchSchema from "../branch-validation";
import { saveBranches, parseApiError } from "../branchApi";
import BranchFormFields from "../../components/BranchForm";
import { initialForm, OptionsData, toPayload } from "../branchUtils";
import type { Branch } from "../../types/BranchSchema";

interface AddFormProps { open: boolean; onClose: () => void; onSuccess: (branches: Branch[]) => void; optionsData: OptionsData }

type FormValues = typeof initialForm;
type BatchValues = { branches: FormValues[] };

const batchSchema = yup.object({
    branches: yup.array().of(branchSchema).min(1, "Add at least one branch").required()
});

export default function AddForm({ open, onClose, onSuccess, optionsData }: AddFormProps) {
    const { control, setValue, setError, clearErrors, trigger, handleSubmit, reset, formState: { errors, isSubmitting } } =
        useForm<BatchValues>({
            defaultValues: { branches: [{ ...initialForm }] },
            resolver: yupResolver(batchSchema) as unknown as Resolver<BatchValues>,
            mode: "onBlur"
        });
    const { fields, append, remove, replace } = useFieldArray({ control, name: "branches" });
    const branches = useWatch({ control, name: "branches" }) ?? [];

    const set = (i: number) => (patch: Record<string, unknown>) =>
        Object.entries(patch).forEach(([k, v]) =>
            setValue(`branches.${i}.${k}` as never, v as never, { shouldDirty: true, shouldValidate: true }));
    const errOf = (i: number) => (name: string) => (errors.branches?.[i] as unknown as Record<string, { message?: string }> | undefined)?.[name]?.message;
    const handleReset = () => {
        replace([{ ...initialForm }]);
        reset({ branches: [{ ...initialForm }] });
    };
    const closeForm = () => { handleReset(); onClose(); };

    // handleSubmit runs the yup schema first; the API is only called when every branch is valid.
    const handleSave = handleSubmit(async ({ branches: values }) => {
        clearErrors();
        try {
            const res = await saveBranches(values.map(toPayload));
            handleReset();
            onClose();
            onSuccess(res.data);
            await showSuccess("Success!", `${values.length} branches created successfully.`);
        } catch (err: unknown) {
            const { message, invalidRows } = parseApiError(err);
            if (invalidRows?.length) {
                invalidRows.forEach(r => r.errors.forEach(e => {
                    const [field, ...rest] = e.split(":");
                    setError(`branches.${r.row - 2}.${field.trim()}` as never, { message: rest.join(":").trim() });
                }));
                await showError("Fix the highlighted fields", `${invalidRows.length} branch(es) have errors.`);
            } else {
                await showError("Error!", message ?? "Failed to create branches.");
            }
        }
    });

    return (
        <Drawer
            open={open}
            onClose={closeForm}
            title={
                <Box sx={{ bgcolor: "#0f172a", color: "#fff", width: "100%", p: 2, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <BusinessIcon sx={{ fontSize: 30 }} />
                        <Box>
                            <Typography variant="h6" fontWeight={700}>Create Branches</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.85 }}>Add one or multiple branches using the forms below.</Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1.5 }}>
                        {["General details", "Location", "Operations", "Documents"].map(label => (
                            <Chip key={label} size="small" label={label} sx={{ bgcolor: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.3)" }} />
                        ))}
                    </Stack>
                </Box>
            }
            footer={
                <Stack direction="row" spacing={1} justifyContent="center" sx={{ width: "100%", flexWrap: "wrap" }}>
                    <Button variant="contained" color="success" startIcon={<SaveIcon />} onClick={handleSave} disabled={isSubmitting}> {isSubmitting ? "Saving..." : `Save All (${fields.length})`} </Button>
                    <Button variant="contained" color="warning" startIcon={<ResetIcon />} onClick={handleReset} disabled={isSubmitting}> Reset </Button>
                    <Button variant="contained" color="error" onClick={closeForm} disabled={isSubmitting}> Cancel </Button>
                    <Button startIcon={<AddIcon />} variant="contained" onClick={() => append({ ...initialForm })} disabled={isSubmitting}> Add More Branch </Button>
                </Stack>
            }
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Branch entries ({fields.length})</Typography>
            </Stack>

            {fields.map((field, index) => (
                <Box key={field.id} sx={{ mb: 3 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight={700}>Branch {index + 1}</Typography>
                        {fields.length > 1 && (
                            <Tooltip title="Remove this branch"><IconButton color="error" onClick={() => remove(index)} disabled={isSubmitting}><DeleteOutlineIcon /></IconButton></Tooltip>
                        )}
                    </Stack>
                    <BranchFormFields
                        data={branches[index] ?? initialForm}
                        set={set(index)}
                        errOf={errOf(index)}
                        onBlur={e => void trigger(`branches.${index}.${e.target.name.split(".").pop()}` as never)}
                        optionsData={optionsData}
                        prefix={`branches.${index}.`} />
                    {index < fields.length - 1 && <Divider sx={{ my: 3 }} />}
                </Box>
            ))}
        </Drawer>
    );
}