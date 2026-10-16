import { useEffect } from "react";
import { Button, Box, Typography, Chip, Stack } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import ResetIcon from "@mui/icons-material/RestartAlt";
import EditIcon from "@mui/icons-material/Edit";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Drawer from "../../components/Drawer";
import { showSuccess, showError } from "../../components/SweetAlert";
import branchSchema from "../branch-validation";
import { updateBranch } from "../branchApi";
import { getErrorMessage, parseIdList, toPayload } from "../branchUtils";
import BranchFormFields from "../../components/branch-form";
import type { OptionsData } from "../../components/branch-form";
import type { Branch } from "../../types/branchSchema";

interface UpdateFormProps { open: boolean; onClose: () => void; onSuccess: (branch: Branch) => void; branch: Branch | null; optionsData: OptionsData }

// DB nulls become empty strings so the form never shows placeholder text; every Branch field is kept for the update call
const toFormValues = (b: Branch) => ({
    ...b,
    branchCode: b.branchCode ?? "", branchName: b.branchName ?? "", branchType: b.branchType ?? "",
    communicationName: b.communicationName ?? "", area: b.area ?? "", zipCode: b.zipCode ?? "",
    address1: b.address1 ?? "", address2: b.address2 ?? "", mobile: b.mobile ?? "", telephone: b.telephone ?? "",
    email: b.email ?? "", remarks: b.remarks ?? "", branchLogo: b.branchLogo ?? "", documentPath: b.documentPath ?? "",
    departmentIds: parseIdList(b.departmentIds).join(","),
    serviceIds: parseIdList(b.serviceIds).join(","),
    contactPerson: b.contactPerson ? String(b.contactPerson) : "",
    workingHoursId: b.workingHoursId ? String(b.workingHoursId) : "",
    latitude: b.latitude?.toString() ?? "",
    longitude: b.longitude?.toString() ?? ""
});
type EditValues = ReturnType<typeof toFormValues>;

export default function UpdateForm({ open, onClose, onSuccess, branch, optionsData }: UpdateFormProps) {
    const { setValue, trigger, handleSubmit, reset, getValues, watch, formState: { errors, isSubmitting, isDirty } } = useForm<EditValues>({
        defaultValues: branch ? toFormValues(branch) : undefined,
        resolver: yupResolver(branchSchema) as unknown as Resolver<EditValues>,
        mode: "onBlur"
    });
    useEffect(() => { reset(branch ? toFormValues(branch) : undefined); }, [branch, reset]);

    const data = watch();
    const set = (patch: Record<string, unknown>) =>
        Object.entries(patch).forEach(([k, v]) =>
            setValue(k as keyof EditValues, v as never, { shouldDirty: true, shouldValidate: true }));
    // the City error message is not shown in the edit form (same as before)
    const errOf = (name: string) =>
        name === "cityId" ? undefined : (errors as unknown as Record<string, { message?: string }>)[name]?.message;
    const handleUpdate = handleSubmit(async () => {
        if (!isDirty) {
            await showError("No Changes", "Please modify a field before updating, or click Back.");
            return;
        }
        try {
            const res = await updateBranch(toPayload(getValues()));
            onSuccess(res.data);
            onClose();
            await showSuccess("Success!", res.data?.message || "Branch updated successfully.");
        } catch (err: unknown) {
            await showError("Error!", getErrorMessage(err, "Failed to update branch."));
        }
    });
    const handleReset = () => { if (branch) reset(toFormValues(branch)); };

    if (!branch) return null;

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={
                <Box sx={{ width: "100%", p: 2, boxSizing: "border-box" }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <BusinessIcon sx={{ fontSize: 30, color: "#ffffff" }} />
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#ffffff" }}>Edit Branch</Typography>
                            <Typography variant="body2" sx={{ color: "#ffffff", opacity: 0.85 }}>Review and update the branch information below.</Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1.5 }}>
                        {["General details", "Location", "Operations"].map(label => (
                            <Chip key={label} size="small" label={label} sx={{ bgcolor: "rgba(255,255,255,0.16)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)" }} />
                        ))}
                    </Stack>
                </Box>
            }
            footer={
                <Stack direction="row" spacing={1} useFlexGap sx={{ width: "100%", justifyContent: "center", flexWrap: "wrap" }}>
                    <Button variant="contained" color="success" startIcon={<EditIcon />} onClick={handleUpdate} disabled={isSubmitting}>{isSubmitting ? "Updating..." : "Update Branch"}</Button>
                    <Button variant="contained" color="warning" startIcon={<ResetIcon />} onClick={handleReset} disabled={isSubmitting}>Reset</Button>
                    <Button variant="contained" color="error" onClick={onClose} disabled={isSubmitting}>Back</Button>
                </Stack>
            }
        >
            <BranchFormFields
                data={data}
                set={set}
                errOf={errOf}
                onBlur={e => void trigger(e.target.name as keyof EditValues)}
                optionsData={optionsData}
                stars={false}
                emptyId={0}
            />
        </Drawer>
    );
}