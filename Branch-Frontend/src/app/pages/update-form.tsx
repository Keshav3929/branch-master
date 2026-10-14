import { useEffect, useState } from "react";
import type { ChangeEvent, FocusEvent, ReactNode } from "react";
import { Button, Box, Typography, Card, CardContent, Paper, Chip, Stack } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import LocationIcon from "@mui/icons-material/LocationOn";
import ContactIcon from "@mui/icons-material/ContactPhone";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ResetIcon from "@mui/icons-material/RestartAlt";
import EditIcon from "@mui/icons-material/Edit";
import SettingsIcon from "@mui/icons-material/Settings";
import { isAxiosError } from "axios";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Drawer from "../../components/Drawer";
import TextField from "../../components/TextField";
import TextArea from "../../components/TextArea";
import Attachment from "../../components/Attachment";
import MultiSelectAutoComplete from "../../components/MultiSelectAutoComplete";
import { showSuccess, showError } from "../../components/SweetAlert";
import branchSchema from "../branch-validation";
import { updateBranch } from "../branchApi";
import { parseIdList, splitCsv, toPayload } from "../branchUtils";
import type { Branch } from "../../types/branchSchema";

interface OptionItem { id: number | string; name: string }
interface OptionsData {
    organizations: OptionItem[]; branchTypes: string[]; regions: OptionItem[]; countries: OptionItem[];
    states: OptionItem[]; cities: OptionItem[]; contactPersons: OptionItem[]; workingHours: OptionItem[];
}
interface UpdateFormProps { open: boolean; onClose: () => void; onSuccess: () => void; branch: Branch | null; optionsData: OptionsData }

type BranchFormState = Omit<Branch, "contactPerson" | "workingHoursId" | "latitude" | "longitude" | "departmentIds" | "serviceIds"> & {
    contactPerson: string; workingHoursId: string; latitude: string; longitude: string; departmentIds: string; serviceIds: string;
};

type FormValues = yup.InferType<typeof branchSchema>;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEPARTMENTS = ["HR", "Finance", "IT", "Sales"];
const SERVICES = ["OPD", "Emergency", "Pharmacy", "Laboratory"];
const sectionStyle = { mb: 2.5, borderRadius: 3, borderColor: "divider", overflow: "visible" };
const gridStyle = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 };

const mapBranchToState = (b: Branch | null): BranchFormState | null =>
    b ? {
        ...b,
        communicationName: b.communicationName ?? "", area: b.area ?? "", zipCode: b.zipCode ?? "",
        address1: b.address1 ?? "", address2: b.address2 ?? "", mobile: b.mobile ?? "", telephone: b.telephone ?? "",
        email: b.email ?? "", remarks: b.remarks ?? "", branchLogo: b.branchLogo ?? "", documentPath: b.documentPath ?? "",
        departmentIds: parseIdList(b.departmentIds).join(","),
        serviceIds: parseIdList(b.serviceIds).join(","),
        contactPerson: b.contactPerson ? String(b.contactPerson) : "",
        workingHoursId: b.workingHoursId ? String(b.workingHoursId) : "",
        latitude: b.latitude?.toString() ?? "",
        longitude: b.longitude?.toString() ?? ""
    } : null;

const toValidationValues = (b: BranchFormState): FormValues => ({
    branchCode: b.branchCode ?? "", branchName: b.branchName ?? "", communicationName: b.communicationName ?? "",
    organizationId: b.organizationId, branchType: b.branchType ?? "",
    regionId: b.regionId, countryId: b.countryId, stateId: b.stateId, cityId: b.cityId,
    area: b.area ?? "", zipCode: b.zipCode ?? "", address1: b.address1 ?? "", address2: b.address2 ?? "",
    latitude: b.latitude ?? "", longitude: b.longitude ?? "",
    contactPerson: b.contactPerson ?? "", mobile: b.mobile ?? "", telephone: b.telephone ?? "", email: b.email ?? "",
    workingDays: b.workingDays ?? "", workingHoursId: b.workingHoursId ?? "",
    departmentIds: b.departmentIds ?? "", serviceIds: b.serviceIds ?? "",
    status: b.status, branchLogo: b.branchLogo ?? "", documentPath: b.documentPath ?? "", remarks: b.remarks ?? ""
});
const getErrorMessage = (err: unknown, fallback: string): string => {
    if (!isAxiosError(err)) return fallback;
    const d = err.response?.data;
    if (typeof d === "string" && d.trim()) return d;
    return d?.message || d?.error || d?.detail || fallback;
};

export default function UpdateForm({ open, onClose, onSuccess, branch, optionsData }: UpdateFormProps) {
    const [formData, setFormData] = useState<BranchFormState | null>(() => mapBranchToState(branch));
    const [original, setOriginal] = useState<BranchFormState | null>(() => mapBranchToState(branch));

    const { setValue, trigger, handleSubmit, reset, clearErrors, formState: { errors, isSubmitting } } = useForm<FormValues>({
        defaultValues: formData ? toValidationValues(formData) : undefined,
        resolver: yupResolver(branchSchema),
        mode: "onBlur"
    });

    useEffect(() => {
        const mapped = mapBranchToState(branch);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData(mapped);
        setOriginal(mapped);
        reset(mapped ? toValidationValues(mapped) : undefined);
        clearErrors();
    }, [branch, reset, clearErrors]);

    const set = (patch: Partial<BranchFormState>) => {
        setFormData(prev => prev ? { ...prev, ...patch } : null);
        Object.entries(patch).forEach(([key, value]) =>
            setValue(key as keyof FormValues, value as never, { shouldDirty: true, shouldValidate: true }));
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { void trigger(e.target.name as keyof FormValues); };

    const handleAttachment = (event: ChangeEvent<HTMLInputElement>, key: "branchLogo" | "documentPath", maxSize: number) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > maxSize * 1024 * 1024) {
            void showError("File Too Large", `File size must not exceed ${maxSize} MB.`);
            event.target.value = "";
            return;
        }
        set({ [key]: file.name });
    };

    const handleUpdate = handleSubmit(async () => {
        if (!formData) return;
        if (JSON.stringify(formData) === JSON.stringify(original)) {
            await showError("No Changes", "Please modify a field before updating, or click Back.");
            return;
        }
        try {
            const res = await updateBranch(toPayload(formData));
            await onSuccess();
            onClose();
            await showSuccess("Success!", res.data?.message || "Branch updated successfully.");
        } catch (err: unknown) {
            await showError("Error!", getErrorMessage(err, "Failed to update branch."));
        }
    });
    const handleReset = () => {
        setFormData(original);
        reset(original ? toValidationValues(original) : undefined);
        clearErrors();
    };

    type TextKey = "branchCode" | "branchName" | "communicationName" | "area" | "zipCode" | "latitude" | "longitude" | "address1" | "address2" | "mobile" | "telephone" | "email";

    const text = (label: string, name: TextKey) => (
        <TextField label={label} name={name} value={formData?.[name] ?? ""}
            onChange={e => set({ [name]: e.target.value } as Partial<BranchFormState>)}
            onBlur={handleBlur} error={!!errors[name]} helperText={errors[name]?.message?.toString() ?? ""} />
    );

    const pickId = (value: unknown): number | null =>
        value != null && !Array.isArray(value) && typeof value === "object" && "id" in value ? Number(value.id) : null;

    const sectionHeader = (number: string, title: string, subtitle: string, icon: ReactNode) => (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "primary.main", color: "primary.contrastText", flexShrink: 0 }}>{icon}</Box>
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{number}. {title}</Typography>
                <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            </Box>
        </Stack>
    );

    if (!formData) return null;

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
            <Card variant="outlined" sx={sectionStyle}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    {sectionHeader("01", "General Details", "Branch identity and organization", <BusinessIcon />)}
                    <Box sx={gridStyle}>
                        {text("Branch Code", "branchCode")}
                        {text("Branch Name", "branchName")}
                        {text("Communication Name", "communicationName")}
                        <MultiSelectAutoComplete label="Organization" options={optionsData.organizations} value={optionsData.organizations.find(o => Number(o.id) === Number(formData.organizationId)) ?? null} onChange={value => set({ organizationId: pickId(value) ?? 0 })} error={!!errors.organizationId} helperText={errors.organizationId?.message?.toString() ?? ""} />
                        <MultiSelectAutoComplete label="Branch Type" options={optionsData.branchTypes} value={formData.branchType || null} onChange={value => set({ branchType: typeof value === "string" ? value : "" })} error={!!errors.branchType} helperText={errors.branchType?.message?.toString() ?? ""} />
                        <MultiSelectAutoComplete label="Working Hours" options={optionsData.workingHours} value={optionsData.workingHours.find(o => String(o.id) === formData.workingHoursId) ?? null} onChange={value => set({ workingHoursId: pickId(value)?.toString() ?? "" })} />
                    </Box>
                </CardContent>
            </Card>

            <Card variant="outlined" sx={sectionStyle}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    {sectionHeader("02", "Location & Address", "Geographical details and branch address", <LocationIcon />)}
                    <Box sx={gridStyle}>
                        <MultiSelectAutoComplete label="Region" options={optionsData.regions} value={optionsData.regions.find(o => Number(o.id) === Number(formData.regionId)) ?? null} onChange={value => set({ regionId: pickId(value) ?? 0 })} error={!!errors.regionId} helperText={errors.regionId?.message?.toString() ?? ""} />
                        <MultiSelectAutoComplete label="Country" options={optionsData.countries} value={optionsData.countries.find(o => Number(o.id) === Number(formData.countryId)) ?? null} onChange={value => set({ countryId: pickId(value) ?? 0 })} error={!!errors.countryId} helperText={errors.countryId?.message?.toString() ?? ""} />
                        <MultiSelectAutoComplete label="State" options={optionsData.states} value={optionsData.states.find(o => Number(o.id) === Number(formData.stateId)) ?? null} onChange={value => set({ stateId: pickId(value) ?? 0 })} error={!!errors.stateId} helperText={errors.stateId?.message?.toString() ?? ""} />
                        <MultiSelectAutoComplete label="City" options={optionsData.cities} value={optionsData.cities.find(o => Number(o.id) === Number(formData.cityId)) ?? null} onChange={value => set({ cityId: pickId(value) ?? 0 })} />
                        {text("Area", "area")}
                        {text("Zip Code", "zipCode")}
                        {text("Latitude", "latitude")}
                        {text("Longitude", "longitude")}
                        {text("Address Line 1", "address1")}
                        {text("Address Line 2", "address2")}
                    </Box>
                </CardContent>
            </Card>

            <Card variant="outlined" sx={sectionStyle}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    {sectionHeader("03", "Contact Information", "Contact details for this branch", <ContactIcon />)}
                    <Box sx={gridStyle}>
                        <MultiSelectAutoComplete label="Contact Person" options={optionsData.contactPersons} value={optionsData.contactPersons.find(o => String(o.id) === formData.contactPerson) ?? null} onChange={value => set({ contactPerson: pickId(value)?.toString() ?? "" })} />
                        {text("Mobile", "mobile")}
                        {text("Telephone", "telephone")}
                        {text("Email", "email")}
                    </Box>
                </CardContent>
            </Card>

            <Card variant="outlined" sx={sectionStyle}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    {sectionHeader("04", "Operations & Services", "Working schedule, departments and status", <SettingsIcon />)}
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2.5 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Working Days</Typography>
                        <MultiSelectAutoComplete multiple label="Select Working Days" options={DAYS} value={splitCsv(formData.workingDays)} onChange={value => set({ workingDays: (Array.isArray(value) ? value : value == null ? [] : [value]).map(String).join(",") })} />
                    </Paper>
                    <Box sx={gridStyle}>
                        <MultiSelectAutoComplete multiple label="Departments" options={DEPARTMENTS} value={splitCsv(formData.departmentIds)} onChange={value => set({ departmentIds: (Array.isArray(value) ? value : value == null ? [] : [value]).map(String).join(",") })} />
                        <MultiSelectAutoComplete multiple label="Services" options={SERVICES} value={splitCsv(formData.serviceIds)} onChange={value => set({ serviceIds: (Array.isArray(value) ? value : value == null ? [] : [value]).map(String).join(",") })} />
                        <MultiSelectAutoComplete label="Status*" options={["Active", "Inactive"]} value={formData.status ? "Active" : "Inactive"} onChange={value => set({ status: value === "Active" })} />
                    </Box>
                </CardContent>
            </Card>

            <Card variant="outlined" sx={sectionStyle}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    {sectionHeader("05", "Documents & Remarks", "Supporting files and additional notes", <AttachFileIcon />)}
                    <TextArea label="Remarks" name="remarks" value={formData.remarks || ""} onChange={e => set({ remarks: e.target.value })} />
                    <Box sx={{ ...gridStyle, mt: 2.5 }}>
                        {[
                            { key: "branchLogo" as const, label: "Branch Logo", accept: ".jpg,.jpeg,.png", hint: "JPG, PNG · Maximum 5 MB", maxSize: 5 },
                            { key: "documentPath" as const, label: "Supporting Document", accept: ".pdf,.doc,.docx,.xls,.xlsx", hint: "PDF, DOC, DOCX, XLS, XLSX · Maximum 20 MB", maxSize: 20 }
                        ].map(item => (
                            <Paper variant="outlined" key={item.key} sx={{ p: 2, borderRadius: 2, borderStyle: "dashed", bgcolor: "action.hover" }}>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                    <AttachFileIcon color="primary" fontSize="small" />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.label}</Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>{item.hint}</Typography>
                                <Attachment label="Choose File" accept={item.accept} onChange={event => handleAttachment(event, item.key, item.maxSize)} />
                                <Typography variant="body2" sx={{ mt: 1.5, overflowWrap: "anywhere" }} color={formData[item.key] ? "text.primary" : "text.secondary"}>{formData[item.key] || "No file selected"}</Typography>
                            </Paper>
                        ))}
                    </Box>
                </CardContent>
            </Card>
        </Drawer>
    );
}