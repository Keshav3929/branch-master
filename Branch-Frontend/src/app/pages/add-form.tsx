import { Button, Box, Typography, Chip, Stack, IconButton, Tooltip, Divider } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import ResetIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import * as yup from "yup";
import { useForm, useFieldArray } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Drawer from "../../components/Drawer";
import { showSuccess, showError } from "../../components/SweetAlert";
import branchSchema from "../branch-validation";
import { saveBranches } from "../branchApi";
import { getErrorMessage, toPayload } from "../branchUtils";
import BranchFormFields, { initialForm } from "../../components/branch-form";
import type { OptionsData } from "../../components/branch-form";
import { Branch } from "../../types/branchSchema";

interface AddFormProps { open: boolean; onClose: () => void; onSuccess: (branches: Branch[]) => void; optionsData: OptionsData }

type FormValues = typeof initialForm;
type BatchValues = { branches: FormValues[] };

const batchSchema = yup.object({
    branches: yup.array().of(branchSchema).min(1, "Add at least one branch").required()
});

export default function AddForm({ open, onClose, onSuccess, optionsData }: AddFormProps) {
    const { control, setValue, trigger, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
        useForm<BatchValues>({
            defaultValues: { branches: [{ ...initialForm }] },
            resolver: yupResolver(batchSchema) as Resolver<BatchValues>,
            mode: "onBlur"
        });
    const { fields, append, remove } = useFieldArray({ control, name: "branches" });
    const branches = watch("branches");
    const set = (i: number) => (patch: Record<string, unknown>) =>
        Object.entries(patch).forEach(([k, v]) => setValue(`branches.${i}.${k}` as never, v as never, { shouldDirty: true, shouldValidate: true }));
    const errOf = (i: number) => (name: string) => (errors.branches?.[i] as unknown as Record<string, { message?: string }> | undefined)?.[name]?.message;
    const handleReset = () => reset({ branches: [{ ...initialForm }] });
    const closeForm = () => { handleReset(); onClose(); };
    const handleSave = handleSubmit(async ({ branches: values }) => {
        try {
            const res = await saveBranches(values.map(toPayload));
            handleReset();
            onClose();
            onSuccess(res.data);
            await showSuccess("Success!", res.data?.message || `${values.length} branches created successfully.`);
        } catch (err: unknown) {
            await showError("Error!", getErrorMessage(err, "Failed to create branches."));
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
                        {["General details", "Location", "Operations","Documents"].map(label => (
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